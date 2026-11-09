import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';

class SupabaseRealtimeService {
  static final SupabaseRealtimeService _instance = SupabaseRealtimeService._internal();
  factory SupabaseRealtimeService() => _instance;

  SupabaseClient? _client;
  bool _isInitialized = false;

  final List<void Function(Map<String, dynamic> payload)> _onNewSaleListeners = [];
  final List<void Function(Map<String, dynamic> payload)> _onAlertListeners = [];

  SupabaseRealtimeService._internal();

  bool get isInitialized => _isInitialized;

  Future<void> initialize() async {
    if (_isInitialized) return;

    if (AppConfig.supabaseUrl.contains('your-supabase-project')) {
      debugPrint('[SupabaseRealtime] Supabase project URL not yet configured. Skipping initialization.');
      return;
    }

    try {
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        // ignore: deprecated_member_use
        anonKey: AppConfig.supabaseAnonKey,
      );
      _client = Supabase.instance.client;
      _isInitialized = true;
      _subscribeChannels();
      debugPrint('[SupabaseRealtime] Initialized successfully.');
    } catch (e) {
      debugPrint('[SupabaseRealtime] Initialization error: $e');
    }
  }

  void _subscribeChannels() {
    if (_client == null) return;

    try {
      // 1. Listen for new sales created in real time
      _client!
          .channel('public:sales')
          .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'sales',
            callback: (payload) {
              debugPrint('[SupabaseRealtime] New sale received: ${payload.newRecord}');
              for (final listener in _onNewSaleListeners) {
                listener(payload.newRecord);
              }
            },
          )
          .subscribe();

      // 2. Listen for batch updates (e.g. quantity changes or expiry alerts)
      _client!
          .channel('public:batches')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'batches',
            callback: (payload) {
              debugPrint('[SupabaseRealtime] Batch inventory updated: ${payload.newRecord}');
              for (final listener in _onAlertListeners) {
                listener(payload.newRecord);
              }
            },
          )
          .subscribe();
    } catch (e) {
      debugPrint('[SupabaseRealtime] Error subscribing to channels: $e');
    }
  }

  void addNewSaleListener(void Function(Map<String, dynamic> payload) listener) {
    _onNewSaleListeners.add(listener);
  }

  void removeNewSaleListener(void Function(Map<String, dynamic> payload) listener) {
    _onNewSaleListeners.remove(listener);
  }

  void addAlertListener(void Function(Map<String, dynamic> payload) listener) {
    _onAlertListeners.add(listener);
  }

  void removeAlertListener(void Function(Map<String, dynamic> payload) listener) {
    _onAlertListeners.remove(listener);
  }
}
