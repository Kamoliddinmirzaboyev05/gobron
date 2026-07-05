// Pure model tests: JSON<->Dart round-tripping is the only non-trivial logic
// on the client (everything else is thin UI over these models), so this is
// the one check that catches a broken mapping to the backend contract.
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

import 'package:gobron_flutter_admin/features/fields/models/field.dart';
import 'package:gobron_flutter_admin/features/slots/models/slot.dart';

void main() {
  test('Field round-trips opening/closing time and working_days through JSON', () {
    final json = {
      'id': 1,
      'name': 'Bunyodkor Arena',
      'description': null,
      'address': 'Tashkent',
      'latitude': null,
      'longitude': null,
      'images': <String>[],
      'rating': 4.5,
      'opening_time': '08:00:00',
      'closing_time': '23:00:00',
      'slot_duration': 60,
      'working_days': [0, 1, 2, 3, 4, 5, 6],
      'price_per_slot': '150000.00',
      'peak_start_time': '18:00:00',
      'peak_price_multiplier': '1.20',
      'is_active': true,
      'owner_id': 7,
      'created_at': '2026-01-01T00:00:00Z',
    };

    final field = Field.fromJson(json);

    expect(field.openingTime, const TimeOfDay(hour: 8, minute: 0));
    expect(field.closingTime, const TimeOfDay(hour: 23, minute: 0));
    expect(field.slotDuration, 60);
    expect(field.workingDays, [0, 1, 2, 3, 4, 5, 6]);
    expect(field.pricePerSlot, 150000.0);
    expect(field.peakPriceMultiplier, 1.2);

    final roundTripped = field.toJson();
    expect(roundTripped['opening_time'], '08:00:00');
    expect(roundTripped['peak_start_time'], '18:00:00');
  });

  test('Slot status parses each backend enum value', () {
    for (final value in ['available', 'booked', 'blocked']) {
      final slot = Slot.fromJson({
        'id': 1,
        'field_id': 1,
        'slot_date': '2026-07-05',
        'start_time': '08:00:00',
        'end_time': '09:00:00',
        'status': value,
        'price': '10000.00',
      });
      expect(slot.status.name, value);
    }
  });
}
