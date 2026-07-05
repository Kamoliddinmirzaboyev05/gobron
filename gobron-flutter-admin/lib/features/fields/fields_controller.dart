import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers.dart';
import 'fields_repository.dart';
import 'models/field.dart';

final fieldsRepositoryProvider = Provider<FieldsRepository>((ref) {
  return FieldsRepository(ref.watch(apiClientProvider));
});

class FieldsController extends AsyncNotifier<List<Field>> {
  FieldsRepository get _repo => ref.read(fieldsRepositoryProvider);

  @override
  Future<List<Field>> build() => _repo.listMine();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.listMine);
  }

  Future<void> create(Field field) async {
    await _repo.create(field);
    await refresh();
  }

  Future<void> updateField(int id, Field field) async {
    await _repo.update(id, field);
    await refresh();
  }
}

final fieldsControllerProvider = AsyncNotifierProvider<FieldsController, List<Field>>(
  FieldsController.new,
);
