import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_exception.dart';
import 'auth_controller.dart';

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.phone});

  final String phone;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authControllerProvider.notifier).verifyOtp(
          phone: widget.phone,
          code: _codeController.text.trim(),
        );
    // Router redirects to the home shell automatically once state becomes authenticated.
    final error = ref.read(authControllerProvider).error;
    if (error != null && mounted) {
      final message = error is ApiException ? error.message : 'Kod noto\'g\'ri';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final submitting = authState.isLoading;

    return Scaffold(
      appBar: AppBar(title: const Text('Kodni kiriting')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    '${widget.phone} raqamiga yuborilgan kodni kiriting',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 24, letterSpacing: 8),
                    decoration: const InputDecoration(counterText: ''),
                    maxLength: 6,
                    validator: (v) => (v == null || v.length < 4) ? 'Kodni kiriting' : null,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: submitting ? null : _submit,
                    child: submitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Tasdiqlash'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
