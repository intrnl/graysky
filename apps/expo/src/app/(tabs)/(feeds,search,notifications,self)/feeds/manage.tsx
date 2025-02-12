import { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Link, Stack } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { PlusIcon } from "lucide-react-native";

import { Text } from "~/components/text";
import { useHaptics } from "~/lib/hooks/preferences";
import { cx } from "~/lib/utils/cx";
import { FeedsPage } from ".";

export default function Page() {
  const [editing, setEditing] = useState(false);
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => {
                  haptics.selection();
                  setEditing((e) => !e);
                }}
              >
                <Text
                  style={{ color: theme.colors.primary }}
                  className={cx("text-lg", editing && "font-medium")}
                >
                  {editing ? "Done" : "Edit"}
                </Text>
              </TouchableOpacity>
              {!editing && (
                <Link href="/feeds/discover" asChild>
                  <TouchableOpacity className="ml-4">
                    <PlusIcon size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                </Link>
              )}
            </View>
          ),
        }}
      />
      <FeedsPage editing={editing} />
    </>
  );
}
