from app.utils.amount_generator import generate_unique_amount


def test_unique_amount_is_base_plus_one_to_ninety_nine():
    base = 50_000
    amount = generate_unique_amount(base, set())
    assert base < amount <= base + 99


def test_unique_amount_avoids_taken():
    base = 10_000
    taken = {base + i for i in range(1, 99)}  # leave only tip=99
    amount = generate_unique_amount(base, taken)
    assert amount == base + 99


def test_unique_amount_raises_when_all_taken():
    base = 1000
    taken = {base + i for i in range(1, 100)}
    try:
        generate_unique_amount(base, taken)
        assert False, "expected ValueError"
    except ValueError:
        pass
