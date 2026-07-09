"""Self-checks for amenity validation on the owner's field form."""
import pytest
from pydantic import ValidationError

from app.schemas.owner import OwnerFieldIn
from app.utils.amenities import AMENITIES, validate


def _field(**kwargs) -> OwnerFieldIn:
    return OwnerFieldIn(name="Maydon", price_per_hour="100000", **kwargs)


def test_known_amenities_are_deduplicated_and_sorted():
    assert validate(["shower", "parking", "shower"]) == ["parking", "shower"]


def test_unknown_amenity_is_rejected():
    with pytest.raises(ValueError):
        validate(["parking", "helipad"])


def test_every_declared_amenity_passes():
    assert validate(list(AMENITIES)) == sorted(AMENITIES)


def test_form_rejects_an_unknown_amenity():
    with pytest.raises(ValidationError):
        _field(amenities=["helipad"])


def test_form_defaults_to_no_amenities():
    assert _field().amenities == []


def test_closing_before_opening_is_allowed_it_means_past_midnight():
    from datetime import time

    body = _field(opening_time=time(8, 0), closing_time=time(1, 0))
    assert body.closing_time < body.opening_time


def test_coordinates_outside_the_globe_are_rejected():
    with pytest.raises(ValidationError):
        _field(latitude=91)
    with pytest.raises(ValidationError):
        _field(longitude=-181)
