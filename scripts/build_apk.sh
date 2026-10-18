#!/usr/bin/env bash
set -e

ROOT_DIR="$(pwd)"
echo "=== 1. Building Vite Production Assets ==="
npm run build

BUILD_DIR="$ROOT_DIR/android_build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/bin" "$BUILD_DIR/src/com/studio/webp2jpg" "$BUILD_DIR/res/values" "$BUILD_DIR/res/drawable" "$BUILD_DIR/res/mipmap-xxhdpi" "$BUILD_DIR/assets"

# Copy built web app to assets
cp -r "$ROOT_DIR/dist" "$BUILD_DIR/assets/"

# Copy icon
cp "$ROOT_DIR/public/pwa-192x192.png" "$BUILD_DIR/res/drawable/icon.png"
cp "$ROOT_DIR/public/pwa-192x192.png" "$BUILD_DIR/res/mipmap-xxhdpi/ic_launcher.png"

echo "=== 2. Creating Android Manifest & Resources ==="

cat << 'EOF' > "$BUILD_DIR/AndroidManifest.xml"
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.studio.webp2jpg"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/icon"
        android:theme="@android:style/Theme.NoTitleBar"
        android:hardwareAccelerated="true"
        android:allowBackup="true">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">WebP в JPG</string>
</resources>
EOF

echo "=== 3. Creating MainActivity.java ==="

cat << 'EOF' > "$BUILD_DIR/src/com/studio/webp2jpg/MainActivity.java"
package com.studio.webp2jpg;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> fileUploadCallback;
    private final static int FILE_CHOOSER_REQUEST_CODE = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (fileUploadCallback != null) {
                    fileUploadCallback.onReceiveValue(null);
                }
                fileUploadCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                startActivityForResult(Intent.createChooser(intent, "Выберите изображения"), FILE_CHOOSER_REQUEST_CODE);
                return true;
            }
        });

        // Load bundled offline React application
        webView.loadUrl("file:///android_asset/dist/index.html");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (fileUploadCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                }
            }
            fileUploadCallback.onReceiveValue(results);
            fileUploadCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
EOF

ANDROID_JAR="/usr/share/java/com.android.android-23.jar"

echo "=== 4. Packaging Resources with AAPT ==="
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -I "$ANDROID_JAR"

echo "=== 5. Compiling Java with JAVAC ==="
javac -source 8 -target 8 \
    -bootclasspath "$ANDROID_JAR" \
    -d "$BUILD_DIR/obj" \
    "$BUILD_DIR/gen/com/studio/webp2jpg/R.java" \
    "$BUILD_DIR/src/com/studio/webp2jpg/MainActivity.java"

echo "=== 6. Converting Bytecode to Dalvik DEX ==="
/usr/bin/dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/obj"

echo "=== 7. Creating Initial APK Package ==="
aapt package -f \
    -M "$BUILD_DIR/AndroidManifest.xml" \
    -S "$BUILD_DIR/res" \
    -A "$BUILD_DIR/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/bin/app-unaligned.apk"

# Add compiled DEX to APK
cd "$BUILD_DIR/bin"
aapt add "app-unaligned.apk" "classes.dex"
cd "$ROOT_DIR"

echo "=== 8. ZipAligning APK ==="
zipalign -f -p 4 "$BUILD_DIR/bin/app-unaligned.apk" "$BUILD_DIR/bin/app-aligned.apk"

echo "=== 9. Signing APK with apksigner ==="
KEYSTORE="$BUILD_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey -v \
        -keystore "$KEYSTORE" \
        -storepass android \
        -alias androiddebugkey \
        -keypass android \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US"
fi

OUTPUT_APK="$ROOT_DIR/public/webp-to-jpg-converter.apk"
apksigner sign \
    --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --key-pass pass:android \
    --out "$OUTPUT_APK" \
    "$BUILD_DIR/bin/app-aligned.apk"

echo "=== 10. Verifying APK Signature ==="
apksigner verify --verbose "$OUTPUT_APK"

echo "SUCCESS: APK generated at $OUTPUT_APK"
ls -lh "$OUTPUT_APK"
