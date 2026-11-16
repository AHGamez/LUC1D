import { Suspense, lazy, useCallback, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from "react";
import { Wallpaper } from "./shell/Wallpaper";
import { Sidebar } from "./shell/Sidebar";
import { TabBar } from "./shell/TabBar";
import { StatusBar } from "./shell/StatusBar";
import { WindowFrame } from "./shell/WindowFrame";
import { LayoutChooser } from "./shell/LayoutChooser";
import { LucidHome } from "./shell/LucidHome";
import { Ps5Home } from "./shell/Ps5Home";
import { GlassHome } from "./shell/GlassHome";
import { AuthScreen, RecoveryScreen, SetupScreen } from "./components/auth/AuthScreens";
import { Spinner } from "./components/ui/kit";
import { useToast } from "./components/ui/Toasts";
import { APPS, findApp } from "./apps/registry";
import type { AppDefinition, AppProps, ShellApi } from "./apps/types";
import { supabaseConfigured } from "./lib/supabase";
import { skipLogin } from "./lib/config";
import { useSession } from "./lib/session";
import { usePrefs } from "./lib/prefs";
import { useWindows } from "./hooks/useWindows";
import { useInstalledGames } from "./hooks/useInstalledGames";
import { usePassPing } from "./features/pass/usePassPing";
import { shouldMountLublox } from "./features/lublox/lublox";
import { TurkeyHuntPanel } from "./features/turkey/TurkeyHuntPanel";
import { useTurkeyLive } from "./features/turkey/useTurkeyStatus";
import { useDeviceMode } from "./features/device/useDeviceMode";
import DeviceEntry from "./features/device/DeviceEntry";
import { initTabCloak } from "./features/device/tabCloaks";
import BootIntro from "./shell/extras/BootIntro";
import InstallPrompt from "./shell/extras/InstallPrompt";
import SiteNotifications from "./shell/extras/SiteNotifications";
import UpdateLog from "./shell/extras/UpdateLog";
import { ShimejiWalkers } from "./shell/extras/Shimeji";
import { SiteAnnouncement } from "./features/site/SiteAnnouncement";
import { AdPaymentReturn } from "./features/site/AdPaymentReturn";
import { DonationReturn } from "./features/donate/DonationReturn";
import { ComingCountdown } from "./features/site/ComingCountdown";
import { SiteAnnouncementAuthor } from "./features/site/SiteAnnouncementAuthor";
import { XmasGift } from "./features/xmas/xmas-gift";
import { useXmasAccess } from "./features/xmas/xmasAccess";

// One lazy component per app, created once so React keeps the loaded module.
const lazyApps = new Map<string, LazyExoticComponent<ComponentType<AppProps>>>();
function appComponent(appId: string) {
  let C = lazyApps.get(appId);
  if (!C) {
    const app = findApp(appId);
    if (!app) throw new Error(`Unknown app "${appId}"`);
    C = lazy(app.load);
    lazyApps.set(appId, C);
  }
  return C;
}

export default function App() {
  // Opt-in tab cloak: applies the user's saved choice once at startup (default off).
  useEffect(() => {
    initTabCloak();
  }, []);

  return (
    <>
      {supabaseConfigured ? <SessionGate /> : <SetupScreen />}
      {/* Asks Mobile or Computer on every startup. It is a fixed overlay, so its place here does not matter. */}
      <DeviceEntry />
    </>
  );
}

function SessionGate() {
  const session = useSession();
  if (session.loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (session.recovery) return <RecoveryScreen />;
  if (!session.user && !skipLogin) return <AuthScreen />;
  return <Desktop />;
}

/** The desktop shell, shown once a user is signed in (or when sign-in is skipped). */
function Desktop() {
  const session = useSession();
  const { toast } = useToast();
  const { prefs, ready, update, reset } = usePrefs();
  const { wins, active, openApp, close, focus } = useWindows();
  const userId = session.user?.id ?? null;
  const { installed, install } = useInstalledGames(userId);
  const { reduceEffects } = useDeviceMode();
  const turkeyLive = useTurkeyLive();
  useXmasAccess();
  // Battle Pass pings run while signed in, even with the pass window closed.
  usePassPing(toast, true);

  const goHome = useCallback(() => focus(null), [focus]);
  const closeWindow = useCallback((id: string) => close(id), [close]);
  const signOut = useCallback(async () => {
    goHome();
    try {
      await session.signOut();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sign-out failed", "error");
    }
  }, [goHome, session, toast]);

  const shell = useMemo<ShellApi>(
    () => ({
      prefs,
      updatePrefs: update,
      resetPrefs: reset,
      openApp,
      closeWindow,
      toast,
      installedGames: installed,
      installGame: async (gameId: string) => {
        try {
          await install(gameId);
          toast("Game installed", "success");
        } catch (err) {
          toast(err instanceof Error ? err.message : "Could not install that game", "error");
          throw err;
        }
      },
      signOut,
    }),
    [prefs, update, reset, openApp, closeWindow, toast, installed, install, signOut],
  );

  const chooser = ready && !prefs.layout && <LayoutChooser onPick={(layout) => update({ layout })} />;

  // The Turkey Hunt app is not docked; it appears in the dock only while a hunt is live.
  const turkeyApps: AppDefinition[] = turkeyLive ? APPS.filter((a) => a.id === "turkey") : [];
  const dockApps = [...APPS.filter((a) => a.dock), ...turkeyApps];
  const openTurkey = () => openApp("turkey");

  // Every open window stays mounted (hidden when not in front), so each app keeps its state across tab switches.
  // Lublox is the exception: its 3D scene is unmounted when it is not in front, as in the original.
  const windowLayer = (zoomOpen: boolean) =>
    wins.map((w) => {
      if (!shouldMountLublox(w.appId, active?.id ?? null)) return null;
      const Comp = appComponent(w.appId);
      return (
        <div key={w.id} className="absolute inset-0" hidden={active?.id !== w.id}>
          <WindowFrame title={w.title} icon={w.icon} zoomOpen={zoomOpen} onClose={() => closeWindow(w.id)}>
            <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
              <Comp windowId={w.id} payload={w.payload} shell={shell} session={session} />
            </Suspense>
          </WindowFrame>
        </div>
      );
    });

  if (prefs.layout === "glass") {
    return (
      <div className="relative h-dvh w-full select-none overflow-hidden bg-background">
        <BootIntro />
        <SiteNotifications toast={toast} />
        <SiteAnnouncement />
        <AdPaymentReturn />
        <DonationReturn />
        <XmasGift />
        {chooser}
        <Wallpaper prefs={prefs} />
        <GlassHome
          tiles={dockApps}
          onOpen={(id) => openApp(id)}
          onHome={goHome}
          onSignOut={signOut}
          clock24={prefs.clock24}
          clockFont={prefs.clockFont}
          clockColor={prefs.clockColor}
          windowOpen={!!active}
          activeAppId={active?.appId ?? null}
          openAppIds={wins.map((w) => w.appId)}
        >
          <UpdateLog />
          <InstallPrompt />
          <TurkeyHuntPanel onOpen={openTurkey} />
        </GlassHome>
        {active && (
          <div className="absolute inset-x-3 bottom-24 top-16 z-30">
            <div className="relative h-full">{windowLayer(false)}</div>
          </div>
        )}
      </div>
    );
  }

  if (prefs.layout === "ps5") {
    return (
      <div className="relative h-dvh w-full select-none overflow-hidden bg-background">
        <BootIntro />
        <SiteNotifications toast={toast} />
        <SiteAnnouncement />
        <AdPaymentReturn />
        <DonationReturn />
        <XmasGift />
        {chooser}
        <Wallpaper prefs={prefs} />
        <Ps5Home tiles={dockApps} onOpen={(id) => openApp(id)} onSignOut={signOut} clock24={prefs.clock24} />
        {active && (
          <div className="absolute inset-0 z-30 p-3">
            <div className="relative h-full">{windowLayer(true)}</div>
          </div>
        )}
        {active && (
          <button
            onClick={goHome}
            className="shell-glass absolute bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border px-4 py-1.5 text-xs text-foreground"
          >
            ⌂ Home
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative grid h-dvh w-full grid-cols-[56px_minmax(0,1fr)] select-none gap-2 overflow-hidden bg-background p-2">
      <BootIntro />
      <SiteNotifications toast={toast} />
      <SiteAnnouncement />
      <AdPaymentReturn />
      <DonationReturn />
      <XmasGift />
      {chooser}
      <Wallpaper prefs={prefs} />
      <Sidebar
        gridApps={prefs.appsOnDesktop}
        onHome={goHome}
        onOpen={(id) => openApp(id)}
        onSignOut={signOut}
        extraApps={turkeyApps}
        activeAppId={active?.appId ?? null}
        openAppIds={wins.map((w) => w.appId)}
      />
      <div className="shell-rounded flex min-w-0 flex-col overflow-hidden border">
        <header className="shell-glass relative z-20 border-b">
          <TabBar wins={wins} activeId={active?.id ?? null} onHome={goHome} onFocus={focus} onClose={closeWindow} />
          <StatusBar activeTitle={active?.title ?? null} clock24={prefs.clock24} />
        </header>
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <ShimejiWalkers enabled={prefs.shimejis} mobile={reduceEffects} />
          <LucidHome onOpen={(id) => openApp(id)} gridApps={prefs.appsOnDesktop}>
            <ComingCountdown />
            <SiteAnnouncementAuthor />
            <UpdateLog />
            <InstallPrompt />
            <TurkeyHuntPanel onOpen={openTurkey} />
          </LucidHome>
          {windowLayer(false)}
        </main>
      </div>
    </div>
  );
}
