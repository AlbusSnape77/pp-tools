from delta_companion.single_instance import SingleInstance


class FakeMutex:
    def __init__(self):
        self.owner = None

    def acquire(self, name):
        if self.owner is not None:
            return None
        self.owner = object()
        return self.owner

    def release(self, handle):
        if self.owner is handle:
            self.owner = None


class FakeNotifier:
    def __init__(self):
        self.start_requested = False

    def request_start(self):
        self.start_requested = True


def test_second_instance_notifies_existing_instance():
    mutex = FakeMutex()
    notifier = FakeNotifier()
    first = SingleInstance("PPTools.DeltaCompanion", mutex, notifier)
    second = SingleInstance("PPTools.DeltaCompanion", mutex, notifier)

    assert first.acquire()
    assert not second.acquire()
    assert notifier.start_requested

    first.release()
    assert second.acquire()
