import 'package:flutter_test/flutter_test.dart';
import 'package:pharmalytics_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const PharmalyticsApp());
    expect(find.text('Pharmalytics'), findsWidgets);
  });
}
