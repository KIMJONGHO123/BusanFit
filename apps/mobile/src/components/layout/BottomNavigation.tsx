import { Href, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';
import { colors } from '@/theme';

type TabKey = 'create' | 'diagnosis' | 'map' | 'saved';

type BottomNavItem = {
  key: TabKey;
  label: string;
  route: Href;
  requiresAuth?: boolean;
};

const navItems: BottomNavItem[] = [
  { key: 'create', label: '일정 생성', route: '/planner/condition' as Href },
  { key: 'diagnosis', label: '진단', route: '/planner/result' as Href },
  { key: 'map', label: '지도', route: '/planner/map' as Href },
  { key: 'saved', label: '저장', route: '/saved' as Href, requiresAuth: true },
];

function getActiveTab(pathname: string): TabKey {
  if (pathname.startsWith('/planner/result')) {
    return 'diagnosis';
  }

  if (pathname.startsWith('/planner/map')) {
    return 'map';
  }

  if (pathname.startsWith('/saved')) {
    return 'saved';
  }

  return 'create';
}

function NavIcon({ tab, active }: { tab: TabKey; active: boolean }) {
  const color = active ? colors.primary : '#A8B3C4';

  if (tab === 'create') {
    return (
      <View style={[styles.plusCircle, { borderColor: color }]}>
        <View style={[styles.plusLineHorizontal, { backgroundColor: color }]} />
        <View style={[styles.plusLineVertical, { backgroundColor: color }]} />
      </View>
    );
  }

  if (tab === 'diagnosis') {
    return (
      <View style={[styles.checkList, { borderColor: color }]}>
        <View style={styles.checkRow}>
          <View style={[styles.checkDot, { backgroundColor: color }]} />
          <View style={[styles.checkLine, { backgroundColor: color }]} />
        </View>
        <View style={styles.checkRow}>
          <View style={[styles.checkDot, { backgroundColor: color }]} />
          <View style={[styles.checkLine, { backgroundColor: color }]} />
        </View>
      </View>
    );
  }

  if (tab === 'map') {
    return (
      <View style={styles.mapIcon}>
        <View style={[styles.mapPanel, { borderColor: color }]} />
        <View style={[styles.mapPanel, { borderColor: color }]} />
        <View style={[styles.mapPanel, { borderColor: color }]} />
      </View>
    );
  }

  return (
    <View style={[styles.bookmarkIcon, { borderColor: color }]}>
      <View style={[styles.bookmarkCutout, { borderTopColor: color }]} />
    </View>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const activeTab = getActiveTab(pathname);

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const active = item.key === activeTab;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.item, active && styles.activeItem]}
            onPress={() => {
              // 저장 페이지처럼 로그인이 필요한 탭은 인증 상태를 먼저 확인합니다.
              if (item.requiresAuth && !isAuthenticated) {
                router.push('/login');
                return;
              }

              router.push(item.route);
            }}>
            <NavIcon tab={item.key} active={active} />
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const bottomNavigationHeight = 82;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F5',
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  item: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
  activeItem: {
    backgroundColor: '#EEF5FF',
  },
  label: {
    color: '#A8B3C4',
    fontSize: 11,
    fontWeight: '800',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '900',
  },
  plusCircle: {
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 9,
  },
  plusLineHorizontal: {
    position: 'absolute',
    width: 7,
    height: 2,
    borderRadius: 1,
  },
  plusLineVertical: {
    position: 'absolute',
    width: 2,
    height: 7,
    borderRadius: 1,
  },
  checkList: {
    width: 17,
    height: 18,
    justifyContent: 'center',
    gap: 3,
    borderWidth: 2,
    borderRadius: 2,
    paddingHorizontal: 3,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  checkDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
  checkLine: {
    width: 6,
    height: 2,
    borderRadius: 1,
  },
  mapIcon: {
    flexDirection: 'row',
    gap: 1,
  },
  mapPanel: {
    width: 6,
    height: 17,
    borderWidth: 2,
    borderRadius: 1,
  },
  bookmarkIcon: {
    width: 15,
    height: 18,
    borderWidth: 2,
    borderRadius: 2,
  },
  bookmarkCutout: {
    position: 'absolute',
    right: 2,
    bottom: -2,
    left: 2,
    width: 0,
    height: 0,
    borderRightWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 5,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
});
