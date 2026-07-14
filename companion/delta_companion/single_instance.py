from __future__ import annotations

import ctypes


ERROR_ALREADY_EXISTS = 183
EVENT_MODIFY_STATE = 0x0002
SYNCHRONIZE = 0x00100000
WAIT_OBJECT_0 = 0


class WindowsMutex:
    def __init__(self):
        self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    def acquire(self, name: str):
        handle = self.kernel32.CreateMutexW(None, False, name)
        if not handle:
            raise ctypes.WinError(ctypes.get_last_error())
        if ctypes.get_last_error() == ERROR_ALREADY_EXISTS:
            self.kernel32.CloseHandle(handle)
            return None
        return handle

    def release(self, handle) -> None:
        self.kernel32.CloseHandle(handle)


class WindowsStartNotifier:
    def __init__(self, name: str = "Local\\PPTools.DeltaCompanion.Start"):
        self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self.name = name
        self.handle = self.kernel32.CreateEventW(None, True, False, name)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())

    def request_start(self) -> None:
        self.kernel32.SetEvent(self.handle)

    def consume_start_request(self) -> bool:
        if self.kernel32.WaitForSingleObject(self.handle, 0) != WAIT_OBJECT_0:
            return False
        self.kernel32.ResetEvent(self.handle)
        return True

    def close(self) -> None:
        if self.handle:
            self.kernel32.CloseHandle(self.handle)
            self.handle = None


class SingleInstance:
    def __init__(self, name: str, mutex=None, notifier=None):
        self.name = name
        self.mutex = mutex or WindowsMutex()
        self.notifier = notifier or WindowsStartNotifier()
        self.handle = None
        self.acquired = False

    def acquire(self) -> bool:
        if self.acquired:
            return True
        self.handle = self.mutex.acquire(self.name)
        self.acquired = self.handle is not None
        if not self.acquired:
            self.notifier.request_start()
        return self.acquired

    def release(self) -> None:
        if self.handle is not None:
            self.mutex.release(self.handle)
            self.handle = None
        self.acquired = False

    def request_start(self) -> None:
        self.notifier.request_start()

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.release()
