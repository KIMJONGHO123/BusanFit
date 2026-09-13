import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { createTmapDocument, serializeMapData, type TmapData } from '@/features/planner/tmap-document';

type Props = {
  data: TmapData;
  focusRequest: number;
};

export function TmapView({ data, focusRequest }: Props) {
  const appKey = process.env.EXPO_PUBLIC_TMAP_MAP_APP_KEY?.trim() ?? '';
  const webView = useRef<WebView>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const source = useMemo(() => ({ html: createTmapDocument(appKey) }), [appKey]);

  useEffect(() => {
    if (status === 'ready') {
      webView.current?.injectJavaScript(`window.setSchedule(${serializeMapData(data)});true;`);
    }
  }, [data, status]);

  useEffect(() => {
    if (status === 'ready') {
      webView.current?.injectJavaScript('window.focusSchedule();true;');
    }
  }, [focusRequest, status]);

  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => setStatus('error'), 25_000);
    return () => clearTimeout(timer);
  }, [attempt, status]);

  const retry = () => {
    setStatus('loading');
    setAttempt((value) => value + 1);
  };

  return (
    <View style={styles.container}>
      {appKey ? (
        <WebView
          key={attempt}
          ref={webView}
          source={source}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(request) => request.url === 'about:blank' || request.url.startsWith('about:blank#')}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === 'ready') setStatus((current) => current === 'error' ? current : 'ready');
              if (message.type === 'error') setStatus('error');
            } catch { setStatus('error'); }
          }}
          onError={() => setStatus('error')}
          onContentProcessDidTerminate={retry}
          onRenderProcessGone={retry}
          style={styles.container}
        />
      ) : null}
      {!appKey || status !== 'ready' ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          {appKey && status === 'loading' ? (
            <><ActivityIndicator color="#1677ff" /><Text style={styles.title}>TMAP 지도를 불러오는 중입니다</Text></>
          ) : (
            <>
              <Text style={styles.title}>{appKey ? 'TMAP 지도를 불러오지 못했습니다' : 'TMAP 지도 키 설정이 필요합니다'}</Text>
              <Text style={styles.description}>{appKey ? '네트워크 연결과 TMAP 지도 SDK 사용 권한을 확인해 주세요.' : '지도 연결 설정을 완료한 뒤 앱을 다시 실행해 주세요.'}</Text>
              {appKey ? <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={styles.retryText}>지도 다시 불러오기</Text></Pressable> : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef2f6' },
  message: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#eef2f6' },
  title: { fontSize: 15, fontWeight: '700', color: '#172334', textAlign: 'center' },
  description: { fontSize: 12, lineHeight: 18, color: '#526174', textAlign: 'center' },
  retry: { backgroundColor: '#1677ff', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  retryText: { color: 'white', fontWeight: '700' },
});
