import 'package:intl/intl.dart';

import '../../core/network/api_client.dart';
import 'models/slot.dart';

final _dateFmt = DateFormat('yyyy-MM-dd');

class SlotsRepository {
  SlotsRepository(this._api);

  final ApiClient _api;

  Future<List<Slot>> listForField(int fieldId, {DateTime? from, DateTime? to}) async {
    final json = await _api.getList(
      '/owner/fields/$fieldId/slots',
      query: {
        if (from != null) 'date_from': _dateFmt.format(from),
        if (to != null) 'date_to': _dateFmt.format(to),
      },
    );
    return json.map((e) => Slot.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Slot>> generate(int fieldId, {int daysAhead = 14}) async {
    final json = await _api.postList(
      '/owner/fields/$fieldId/slots/generate',
      data: {'days_ahead': daysAhead},
    );
    return json.map((e) => Slot.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Slot> addManual(
    int fieldId, {
    required DateTime date,
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
    double? price,
  }) async {
    final json = await _api.post(
      '/owner/fields/$fieldId/slots',
      data: {
        'slot_date': _dateFmt.format(date),
        'start_time': '${_pad(startHour)}:${_pad(startMinute)}:00',
        'end_time': '${_pad(endHour)}:${_pad(endMinute)}:00',
        if (price != null) 'price': price.toStringAsFixed(2),
      },
    );
    return Slot.fromJson(json);
  }

  Future<Slot> block(int slotId) async {
    final json = await _api.post('/owner/slots/$slotId/block');
    return Slot.fromJson(json);
  }

  Future<Slot> unblock(int slotId) async {
    final json = await _api.post('/owner/slots/$slotId/unblock');
    return Slot.fromJson(json);
  }

  String _pad(int v) => v.toString().padLeft(2, '0');
}
