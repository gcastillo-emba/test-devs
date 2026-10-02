import json
import unittest
from unittest.mock import patch
from io import BytesIO
from backend.domain import build_snapshot, query
from backend.sources import download


def row(aid='A', p='2025-01', cost='100', area='Laboral', level='Senior'):
    return dict(abogado_id=aid, periodo=p, nombre=aid, area=area, nivel=level, sueldo=cost, cargas_sociales='0', gastos_asignados='0', costo_total=cost, horas_facturadas='999')


def record(aid='A', p='2025-01', minutes=60, billable=True, rid='1', **extra):
    return dict(id=rid, abogado_id=aid, fecha_trabajo=p + '-05', fecha_carga=p + '-06', minutos=minutes, facturable=billable, cliente='NO PUBLICAR', asunto='NO PUBLICAR', **extra)


def group(rows, records, start=None, end=None):
    return query(build_snapshot(rows, records), start, end)['grupos'][0]


class CalculationTests(unittest.TestCase):
    def test_normal_weighted_not_mean(self):
        g = group([row(), row('B', cost='300')], [record(minutes=120), record('B', minutes=180, rid='2'), record(minutes=60, billable=False, rid='3')])
        self.assertEqual((g['costo_incluido'], g['horas_facturables'], g['costo_por_hora'], g['estado']), ('400.00', '5.00', '80.00', 'COMPLETO'))

    def test_partial_range_october_gap(self):
        g = group([row(p='2025-09'), row(p='2025-10', cost='500'), row(p='2025-11', cost='300')], [record(p='2025-09'), record(p='2025-11', minutes=540, rid='2')])
        self.assertEqual((g['costo_incluido'], g['horas_facturables'], g['costo_por_hora'], g['estado']), ('400.00', '10.00', '40.00', 'PARCIAL'))
        gap = g['serie'][1]
        self.assertTrue(gap['incompleto'])
        self.assertIsNone(gap['horas_facturables'])
        self.assertIsNone(gap['costo_por_hora'])
        self.assertEqual(gap['costo_contable_disponible'], '500.00')
        self.assertEqual(len(g['meses_incluidos']), 2)

    def test_partial_members(self):
        g = group([row(), row('B', cost='300')], [record()])
        self.assertEqual((g['costo_incluido'], g['costo_excluido'], g['costo_por_hora'], g['estado']), ('100.00', '300.00', '100.00', 'PARCIAL'))
        self.assertEqual((g['abogados_con_cobertura'], g['abogados_total']), (1, 2))

    def test_no_member_coverage(self):
        s = build_snapshot([row()], [record('OTHER')])
        g = query(s)['grupos'][0]
        self.assertIsNone(g['costo_por_hora'])
        self.assertIsNone(g['horas_facturables'])
        self.assertEqual(g['abogados_con_cobertura'], 0)
        individual = query(s, lawyer='A')['individual']
        self.assertEqual(individual['cobertura'], 'SIN COBERTURA DE HORAS')
        self.assertEqual(individual['serie'][0]['costo_total'], '100.00')
        self.assertIsNone(individual['serie'][0]['horas_facturables'])

    def test_real_zero_month_stays_in_range(self):
        g = group([row(), row(p='2025-02', cost='300')], [record(), record(p='2025-02', billable=False, rid='2')])
        self.assertEqual((g['costo_incluido'], g['horas_facturables'], g['costo_por_hora'], g['estado']), ('400.00', '1.00', '400.00', 'COMPLETO'))
        self.assertEqual(g['serie'][1]['horas_facturables'], '0.00')
        self.assertIsNone(g['serie'][1]['costo_por_hora'])
        self.assertEqual(g['serie'][1]['meses_incluidos'], ['2025-02'])

    def test_only_non_billable_real_zero(self):
        g = group([row()], [record(billable=False)])
        self.assertEqual(g['costo_incluido'], '100.00')
        self.assertEqual(g['horas_facturables'], '0.00')
        self.assertEqual(g['cobertura_estado'], 'COMPLETO')
        self.assertEqual(g['estado'], 'NO CALCULABLE')

    def test_zero_individual_includes_cost(self):
        g = group([row(), row('B', cost='300')], [record(p='2025-02'), record('B', minutes=180, rid='2')], '2025-01', '2025-01')
        self.assertEqual((g['costo_incluido'], g['horas_facturables'], g['costo_por_hora']), ('400.00', '3.00', '133.33'))
        self.assertEqual(g['estado'], 'COMPLETO')

    def test_no_eligible_periods(self):
        g = group([row(p='2025-10')], [record(p='2025-11')], '2025-10', '2025-10')
        self.assertEqual(g['meses_incluidos'], [])
        self.assertIsNone(g['costo_incluido'])
        self.assertIsNone(g['horas_facturables'])

    def test_invalid_minutes_and_boolean(self):
        for value in [0, -1, 1.5, '1.5', 'abc', None, True, False, float('inf')]:
            with self.subTest(value=value):
                self.assertIsNone(group([row()], [record(minutes=value)])['costo_por_hora'])
        self.assertEqual(group([row()], [record(minutes='120')])['horas_facturables'], '2.00')
        self.assertIsNone(group([row()], [record(billable='true')])['costo_por_hora'])

    def test_unknown_scope_blocks_integrity(self):
        r = record()
        r['fecha_trabajo'] = None
        s = build_snapshot([row(), row(p='2025-02')], [r, record(p='2025-02', rid='2')])
        self.assertIsNone(query(s)['grupos'][0]['costo_por_hora'])

    def test_duplicates_do_not_sum(self):
        g = group([row()], [record(), record()])
        self.assertIsNone(g['costo_por_hora'])
        g = group([row(), row()], [record()])
        self.assertIsNone(g['costo_por_hora'])
        self.assertIsNone(g['costo_contable_disponible'])
        self.assertEqual(g['meses_incluidos'], [])

    def test_bad_month_does_not_invalidate_other_months(self):
        bad = row(p='2025-02')
        bad['sueldo'] = '99'
        g = group([row(), bad], [record(), record(p='2025-02', rid='2')])
        self.assertEqual(g['costo_por_hora'], '100.00')
        self.assertEqual(g['meses_incluidos'], ['2025-01'])
        self.assertEqual(g['costo_excluido'], '100.00')

    def test_classification_monthly_and_missing_level(self):
        s = build_snapshot([row(), row(p='2025-02', level=''), row(p='2025-03', level='Socio')], [record(), record(p='2025-02', rid='2'), record(p='2025-03', rid='3')])
        self.assertIn('Sin nivel informado', query(s)['opciones']['niveles'])
        q = query(s, levels=['Socio'], lawyer='A')
        self.assertEqual(q['grupos'][0]['costo_incluido'], '100.00')
        self.assertTrue(q['individual']['serie'][0]['fuera_del_filtro'])

    def test_work_date_and_missing_load_date(self):
        r = record()
        r['fecha_carga'] = '2026-02-01'
        s = build_snapshot([row()], [r])
        self.assertEqual(query(s)['grupos'][0]['costo_por_hora'], '100.00')
        r['fecha_carga'] = None
        self.assertEqual(group([row()], [r])['costo_por_hora'], '100.00')
        self.assertNotIn('NO PUBLICAR', json.dumps(query(s)))

    def test_unmatched_keys_visible(self):
        s = build_snapshot([row()], [record('B')])
        q = query(s)
        self.assertTrue(any(o['tipo'] == 'SIN CONTRAPARTE CONTABLE' and o['horas_facturables'] == '1.00' for o in q['observaciones']))
        self.assertTrue(any(o['tipo'] == 'SIN COBERTURA DE HORAS' for o in q['observaciones']))

    def test_decimal_round_half_up_after_sum(self):
        g = group([row(cost='1.005'), row('B', cost='1.005')], [record(), record('B', rid='2')])
        self.assertEqual(g['costo_incluido'], '2.01')
        self.assertEqual(g['costo_por_hora'], '1.01')


class DownloadTests(unittest.TestCase):
    def page(self, data, total, next_page=None, page=1):
        return BytesIO(json.dumps(dict(datos=data, total=total, siguiente=next_page, pagina=page, tamano=500)).encode())

    def test_pagination_complete(self):
        with patch('backend.sources.urlopen', side_effect=[self.page([{}] * 500, 501, '/registros?pagina=2&tamano=500'), self.page([{}], 501, page=2)]) as mock:
            self.assertEqual(len(download()), 501)
            self.assertEqual(mock.call_count, 2)

    def test_short_intermediate_page_with_complete_count(self):
        with patch('backend.sources.urlopen', side_effect=[self.page([{'id': '1'}], 2, '/registros?pagina=2&tamano=500'), self.page([{'id': '2'}], 2, page=2)]):
            self.assertEqual(len(download()), 2)

    def test_repeated_page_content_rejected(self):
        with patch('backend.sources.urlopen', side_effect=[self.page([{}] * 500, 1000, '/registros?pagina=2&tamano=500'), self.page([{}] * 500, 1000, page=2)]):
            with self.assertRaisesRegex(ValueError, 'repetido'):
                download()

    def test_incomplete_repeated_changed_total_and_transport(self):
        cases = [[self.page([], 10)], [self.page([{}] * 500, 501, '/registros?pagina=1&tamano=500')], [self.page([{}] * 500, 501, '/registros?pagina=2&tamano=500'), self.page([{}], 502, page=2)], [self.page([{}] * 500, 501, '/registros?pagina=2&tamano=500'), OSError('transporte')]]
        for pages in cases:
            with self.subTest(pages=len(pages)), patch('backend.sources.urlopen', side_effect=pages):
                with self.assertRaises((ValueError, OSError)):
                    download()
