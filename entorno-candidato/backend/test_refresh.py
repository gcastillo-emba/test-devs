import asyncio
import unittest
from unittest.mock import patch
from fastapi import HTTPException
from backend import main
from backend.domain import build_snapshot
from backend.test_domain import row, record


class RefreshTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.old = main.snapshot, main.refreshing, main.last_error
        main.snapshot = build_snapshot([row()], [record()])
        main.refreshing = False
        main.last_error = None

    async def asyncTearDown(self):
        main.snapshot, main.refreshing, main.last_error = self.old

    async def test_failure_preserves_complete_snapshot(self):
        before = main.snapshot
        with self.assertLogs(level='ERROR'), patch('backend.main.load', side_effect=OSError('fallo a mitad de descarga')):
            result = await main.refresh()
        self.assertIs(main.snapshot, before)
        self.assertEqual(result['ultima_actualizacion'], before.updated_at)
        self.assertIn('fallo', result['error'])
        self.assertFalse(result['actualizando'])

    async def test_failure_without_previous_snapshot(self):
        main.snapshot = None
        with self.assertLogs(level='ERROR'), patch('backend.main.load', side_effect=OSError('sin conexión')):
            result = await main.refresh()
        self.assertFalse(result['con_datos'])
        self.assertIsNone(result['ultima_actualizacion'])
        self.assertIsNotNone(result['error'])

    async def test_atomic_refresh_and_reject_concurrent(self):
        before = main.snapshot
        candidate = build_snapshot([row(cost='300')], [record()])
        import threading
        ready, release = threading.Event(), threading.Event()
        def loading():
            ready.set()
            release.wait(3)
            return candidate
        with patch('backend.main.load', side_effect=loading):
            task = asyncio.create_task(main.refresh())
            await asyncio.to_thread(ready.wait, 2)
            self.assertIs(main.snapshot, before)
            with self.assertRaises(HTTPException) as exc:
                await main.refresh()
            self.assertEqual(exc.exception.status_code, 409)
            release.set()
            await task
        self.assertIs(main.snapshot, candidate)
        self.assertNotEqual(main.snapshot.updated_at, before.updated_at)
