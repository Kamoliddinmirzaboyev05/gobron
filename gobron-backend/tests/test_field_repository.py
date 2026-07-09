"""Self-checks for FieldRepository.list's query construction (sort +
available_today). No live DB: a fake session compiles each statement
(catching any correlate()/subquery mistakes) and returns an empty result.
"""
import pytest

from app.repositories.field_repository import FieldRepository


class _EmptyScalars:
    def all(self):
        return []


class _CompilingResult:
    def scalars(self):
        return _EmptyScalars()


class FakeCompilingDB:
    """Compiles every statement (would raise on a malformed query) instead
    of actually running it against a database.
    """

    async def execute(self, stmt):
        stmt.compile(compile_kwargs={"literal_binds": True})
        return _CompilingResult()


@pytest.mark.asyncio
@pytest.mark.parametrize("sort", ["rating", "cheapest", "popular"])
async def test_list_compiles_for_every_sort_mode(sort):
    repo = FieldRepository(FakeCompilingDB())
    result = await repo.list(sort=sort)
    assert result == []


@pytest.mark.asyncio
async def test_list_compiles_with_available_today_filter():
    repo = FieldRepository(FakeCompilingDB())
    result = await repo.list(available_today=True)
    assert result == []


@pytest.mark.asyncio
async def test_list_compiles_with_all_filters_combined():
    repo = FieldRepository(FakeCompilingDB())
    result = await repo.list(
        search="maydon",
        min_price=10000,
        max_price=500000,
        min_rating=3.5,
        available_today=True,
        sort="popular",
    )
    assert result == []
