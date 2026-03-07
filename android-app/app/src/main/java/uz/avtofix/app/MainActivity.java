package uz.avtofix.app;

import androidx.appcompat.app.AppCompatActivity;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private SwipeRefreshLayout swipeRefreshLayout;
    private static final String WEBSITE_URL = "https://avtofix.uz";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // WebView va SwipeRefreshLayout ni topish
        webView = findViewById(R.id.webView);
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout);

        // Internet ulanishini tekshirish
        if (!isNetworkAvailable()) {
            Toast.makeText(this, "Internet aloqasi yo'q. Iltimos, internetni yoqing.", Toast.LENGTH_LONG).show();
        }

        // WebView sozlamalari
        setupWebView();

        // SwipeRefreshLayout sozlamalari
        setupSwipeRefresh();

        // Saytni yuklash
        webView.loadUrl(WEBSITE_URL);
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        
        // JavaScript yoqish (zarur!)
        webSettings.setJavaScriptEnabled(true);
        
        // DOM Storage yoqish
        webSettings.setDomStorageEnabled(true);
        
        // Cache sozlamalari
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Zoom sozlamalari
        webSettings.setSupportZoom(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        
        // Boshqa sozlamalar
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Mixed content (HTTP va HTTPS) ni ruxsat berish
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // WebViewClient - linklar app ichida ochilishi uchun
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Sahifa yuklangandan keyin refresh tugmasini o'chirish
                if (swipeRefreshLayout.isRefreshing()) {
                    swipeRefreshLayout.setRefreshing(false);
                }
            }

            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                super.onReceivedError(view, errorCode, description, failingUrl);
                Toast.makeText(MainActivity.this, "Xatolik: " + description, Toast.LENGTH_SHORT).show();
            }
        });

        // WebChromeClient - progress bar va boshqa UI elementlar uchun
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                // Progress ko'rsatish
                if (newProgress < 100) {
                    swipeRefreshLayout.setRefreshing(true);
                } else {
                    swipeRefreshLayout.setRefreshing(false);
                }
            }
        });
    }

    private void setupSwipeRefresh() {
        swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                // Sahifani qayta yuklash
                webView.reload();
            }
        });
        
        // Refresh rangini sozlash
        swipeRefreshLayout.setColorSchemeResources(
                android.R.color.holo_blue_bright,
                android.R.color.holo_green_light,
                android.R.color.holo_orange_light,
                android.R.color.holo_red_light
        );
    }

    // Back tugmasi bosilganda
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Agar back tugmasi bosilgan bo'lsa va WebView'da orqaga qaytish mumkin bo'lsa
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        // Aks holda oddiy back tugmasi ishlaydi (ilovadan chiqish)
        return super.onKeyDown(keyCode, event);
    }

    // Internet ulanishini tekshirish
    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (webView != null) {
            webView.destroy();
        }
    }
}
