from operations.health import CheckResult, HealthReport, Status, check_readiness


COMPONENTS = (
    "database",
    "django_q",
    "evolution_v2",
    "evolution_go",
    "smtp",
    "tts",
    "storage",
)


class FakeProbes:
    def __init__(self, results):
        self.results = results

    def run(self, component):
        return self.results[component]


def _results(status=Status.HEALTHY):
    return {
        component: CheckResult(status, "ready")
        for component in COMPONENTS
    }


def test_readiness_is_healthy_when_every_component_is_healthy():
    report = check_readiness(FakeProbes(_results()))

    assert report == HealthReport(
        status=Status.HEALTHY,
        checks=_results(),
    )


def test_readiness_uses_the_most_actionable_failure_status():
    results = _results()
    results["smtp"] = CheckResult(Status.MISCONFIGURED, "not_configured")
    results["evolution_go"] = CheckResult(Status.DISCONNECTED, "unreachable")

    report = check_readiness(FakeProbes(results))

    assert report.status is Status.MISCONFIGURED
    assert report.checks["smtp"].detail == "not_configured"


def test_readiness_converts_unexpected_probe_errors_to_safe_details():
    secret = "postgresql://user:not-a-real-secret@intentionally-not-real-host.example/db"

    class BrokenProbes(FakeProbes):
        def run(self, component):
            if component == "database":
                raise RuntimeError(secret)
            return super().run(component)

    report = check_readiness(BrokenProbes(_results()))

    assert report.status is Status.DISCONNECTED
    assert report.checks["database"] == CheckResult(
        Status.DISCONNECTED,
        "probe_failed",
    )
    assert secret not in repr(report)
