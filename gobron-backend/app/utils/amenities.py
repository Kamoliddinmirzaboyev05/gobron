"""The facilities a field can offer.

Keys are stored in the DB; the labels live in the frontends so they can be
translated without a migration. Validation only checks membership here, so
adding an amenity is one line plus a label in each client.
"""

AMENITIES = (
    "parking",
    "shower",
    "changing_room",
    "lighting",
    "wc",
    "cafe",
    "wifi",
    "tribune",
    "ball_rental",
    "first_aid",
)


def validate(keys: list[str]) -> list[str]:
    """Drop duplicates, reject anything unknown. Order is not meaningful."""
    unknown = set(keys) - set(AMENITIES)
    if unknown:
        raise ValueError(f"Noma'lum qulaylik: {', '.join(sorted(unknown))}")
    return sorted(set(keys))
