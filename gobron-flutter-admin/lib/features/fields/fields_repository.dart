import '../../core/network/api_client.dart';
import 'models/field.dart';

class FieldsRepository {
  FieldsRepository(this._api);

  final ApiClient _api;

  Future<List<Field>> listMine() async {
    final json = await _api.getList('/owner/fields');
    return json.map((e) => Field.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Field> create(Field field) async {
    final json = await _api.post('/owner/fields', data: field.toOwnerJson());
    return Field.fromJson(json);
  }

  Future<Field> update(int id, Field field) async {
    final json = await _api.patch(
      '/owner/fields/$id',
      data: field.toOwnerJson(),
    );
    return Field.fromJson(json);
  }
}
