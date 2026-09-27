import asyncio
import json

from fastapi.testclient import TestClient

from app import main
from app.main import app

c = TestClient(app)
IDS = {"sales", "finance", "operations", "marketing", "support", "saas"}
TYPES = {"number", "line", "bar", "gauge", "leaderboard", "donut"}


def is_l(x):
    return set(x) == {"fa", "en"} and all(isinstance(v, str) and v for v in x.values())


def check_widget(w):
    assert w["type"] in TYPES and w["span"] in (1, 2) and is_l(w["title"]), w
    assert w["unit"] in ("toman", "percent", "count", "minutes", "score", None)
    assert not any(k.startswith("_") for k in w)
    t = w["type"]
    if t in ("number", "gauge"):
        assert w["value"] >= 0
        if w["unit"] == "percent":
            assert w["value"] <= 100
    if t == "number":
        assert w["previous"] > 0 and w["good"] in ("up", "down") and len(w["series"]) == 20
    if t == "gauge":
        assert 0 <= w["value"] <= w["goal"] * 1.1
    if t == "line":
        assert len(w["series"]) == 30
    for p in w.get("series", []):
        assert p["v"] >= 0 and "T" in p["t"]
    if t == "bar":
        assert 5 <= len(w["bars"]) <= 7
    if t == "leaderboard":
        vs = [i["v"] for i in w["items"]]
        assert len(vs) == 5 and vs == sorted(vs, reverse=True)
    if t == "donut":
        assert 3 <= len(w["items"]) <= 5
    for i in w.get("bars", []) + w.get("items", []):
        assert is_l(i["label"]) and i["v"] > 0
    if w["unit"] in ("count", "toman"):
        for v in [w.get("value")] + [p["v"] for p in w.get("series", [])]:
            assert v is None or isinstance(v, int), (w["id"], v)


def check_dashboards():
    for d in c.get("/api/dashboards").json():
        body = c.get(f"/api/dashboards/{d['id']}").json()
        assert body["id"] == d["id"] and is_l(body["title"]) and "T" in body["updated_at"]
        ws = body["widgets"]
        assert 7 <= len(ws) <= 9 and sum(w["span"] == 2 for w in ws) >= 2
        for w in ws:
            check_widget(w)


def test_health():
    assert c.get("/api/health").json() == {"status": "ok"}


def test_dashboards():
    ds = c.get("/api/dashboards").json()
    assert {d["id"] for d in ds} == IDS
    assert all(is_l(d["title"]) and d["icon"] for d in ds)
    check_dashboards()
    types = {w["type"] for d in IDS for w in c.get(f"/api/dashboards/{d}").json()["widgets"]}
    assert types == TYPES


def test_404():
    assert c.get("/api/dashboards/nope").status_code == 404
    assert c.get("/api/dashboards/nope/stream").status_code == 404


def test_bounds_after_many_ticks():
    main.advance(3000)
    check_dashboards()


def test_plans_connectors():
    ps = c.get("/api/plans").json()
    assert [p["price_toman"] for p in ps] == [4_900_000, 14_900_000, 39_000_000, None]
    assert [p["highlighted"] for p in ps] == [False, False, True, False]
    for p in ps:
        assert is_l(p["name"]) and len(p["features"]["fa"]) == len(p["features"]["en"]) > 0
    cats = {"file", "database", "commerce", "payment", "crm", "communication", "api"}
    cs = c.get("/api/connectors").json()
    assert all(is_l(x["name"]) and x["category"] in cats for x in cs)
    assert {x["category"] for x in cs} == cats


def test_stream_first_event():
    # Drive the generator directly: TestClient can't close an infinite stream cleanly.
    class Req:
        async def is_disconnected(self):
            return False

    async def first():
        resp = await main.stream("sales", Req())
        assert resp.headers["cache-control"] == "no-cache, no-transform"
        assert resp.headers["x-accel-buffering"] == "no"
        return await resp.body_iterator.__anext__()

    msg = asyncio.run(first())
    assert msg.startswith("event: update\ndata: ") and msg.endswith("\n\n")
    assert json.loads(msg.split("data: ", 1)[1])["id"] == "sales"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("all tests passed")
