import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'models/slot.dart';
import 'slots_repository.dart';

final slotsRepositoryProvider = Provider<SlotsRepository>((ref) {
  return SlotsRepository(ref.watch(apiClientProvider));
});

/// One controller instance per field — `family` keyed by fieldId.
class SlotsController extends FamilyAsyncNotifier<List<Slot>, int> {
  SlotsRepository get _repo => ref.read(slotsRepositoryProvider);
  late final int fieldId;

  @override
  Future<List<Slot>> build(int arg) {
    fieldId = arg;
    final today = DateTime.now();
    return _repo.listForField(fieldId, from: today, to: today.add(const Duration(days: 30)));
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() {
      final today = DateTime.now();
      return _repo.listForField(fieldId, from: today, to: today.add(const Duration(days: 30)));
    });
  }

  Future<void> generate({int daysAhead = 14}) async {
    await _repo.generate(fieldId, daysAhead: daysAhead);
    await refresh();
  }

  Future<void> addManual({
    required DateTime date,
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
    double? price,
  }) async {
    await _repo.addManual(
      fieldId,
      date: date,
      startHour: startHour,
      startMinute: startMinute,
      endHour: endHour,
      endMinute: endMinute,
      price: price,
    );
    await refresh();
  }

  Future<void> toggleBlock(Slot slot) async {
    if (slot.status == SlotStatus.blocked) {
      await _repo.unblock(slot.id);
    } else {
      await _repo.block(slot.id);
    }
    await refresh();
  }
}

final slotsControllerProvider =
    AsyncNotifierProvider.family<SlotsController, List<Slot>, int>(SlotsController.new);
