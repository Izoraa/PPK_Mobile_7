import { NativeTabs } from "expo-router/native-tabs";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";
import { useApp } from "@/state/AppContext";

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const { currentUser } = useApp();
  const brandBlue = "#0D21A1";
  const selectedIconColor = "#E5E7EB";

  return (
    <NativeTabs
      backgroundColor={colors.background}
      shadowColor="#475569"
      indicatorColor={brandBlue}
      rippleColor={brandBlue}
      iconColor={{ default: colors.textSecondary, selected: selectedIconColor }}
      labelStyle={{ selected: { color: brandBlue } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Beranda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          renderingMode="template"
          selectedColor={selectedIconColor}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="new-session"
        hidden={currentUser?.role !== "assistant"}
      >
        <NativeTabs.Trigger.Label>Tambah Sesi</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus" md="add" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="attendance-history"
        hidden={currentUser?.role !== "student"}
      >
        <NativeTabs.Trigger.Label>Riwayat</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="coordinator-classes"
        hidden={currentUser?.role !== "coordinator"}
      >
        <NativeTabs.Trigger.Label>Kelas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="school" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="coordinator-assistants"
        hidden={currentUser?.role !== "coordinator"}
      >
        <NativeTabs.Trigger.Label>Asisten</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.2" md="group" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="coordinator-laboratories"
        hidden={currentUser?.role !== "coordinator"}
      >
        <NativeTabs.Trigger.Label>Ruang Lab</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.2" md="meeting_room" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" selectedColor={selectedIconColor} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
