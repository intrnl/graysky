import { useCallback, useEffect, useRef, useState } from "react"; // Layoutn is just an example and should be replaced by real animation. For Instance Layout

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ContextMenuButton } from "react-native-ios-context-menu";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  Layout,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Link,
  Stack,
  useFocusEffect,
  useNavigation,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppBskyEmbedRecord } from "@atproto/api";
import { useTheme } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Check, Paperclip, Plus, Send, X } from "lucide-react-native";

import { Avatar } from "../../components/avatar";
import { Embed } from "../../components/embed";
import { FeedPost } from "../../components/feed-post";
import { RichText } from "../../components/rich-text";
import { useAuthedAgent } from "../../lib/agent";
import {
  generateRichText,
  MAX_IMAGES,
  MAX_LENGTH,
  useImages,
  useQuote,
  useReply,
  useSendPost,
} from "../../lib/hooks/composer";
import { useContentFilter } from "../../lib/hooks/preferences";
import { cx } from "../../lib/utils/cx";

export default function ComposerScreen() {
  const theme = useTheme();
  const agent = useAuthedAgent();
  const navigation = useNavigation();
  const { contentFilter } = useContentFilter();

  const reply = useReply();
  const quote = useQuote();

  const [text, setText] = useState("");
  const { images, imagePicker, addAltText, removeImage } = useImages();

  const textRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      setTimeout(() => {
        textRef.current?.focus();
      }, 100);
    }, []),
  );

  const rt = useQuery({
    queryKey: ["rt", text],
    queryFn: async () => {
      return await generateRichText(text, agent);
    },
    keepPreviousData: true,
  });

  const tooLong = (rt.data?.graphemeLength ?? 0) > MAX_LENGTH;
  const isEmpty = text.trim().length === 0 && images.length === 0;

  const send = useSendPost({
    text,
    images,
    reply: reply.ref,
    record: quote.ref,
  });

  useEffect(() => {
    navigation.getParent()?.setOptions({ gestureEnabled: isEmpty });
  }, [navigation, isEmpty]);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.card }}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <CancelButton
              hasContent={!isEmpty}
              onSave={() => Alert.alert("Not yet implemented")}
              disabled={send.isLoading}
            />
          ),

          headerRight: () => (
            <PostButton
              onPress={send.mutate}
              disabled={isEmpty}
              loading={send.isLoading}
            />
          ),
          headerTitleStyle: { color: "transparent" },
        }}
      />
      {send.isError && (
        <View className="bg-red-500 px-4 py-3">
          <Text className="text-lg font-medium leading-6 text-white">
            {send.error instanceof Error
              ? send.error.message
              : "An unknown error occurred"}
          </Text>
          <Text className="my-1 text-white/90">Please try again</Text>
        </View>
      )}
      <ScrollView className="pt-4">
        {reply.thread.data && (
          <Animated.View layout={Layout} pointerEvents="none">
            <FeedPost
              item={reply.thread.data}
              dataUpdatedAt={0}
              filter={contentFilter(reply.thread.data.post.labels)}
              hasReply
              isReply
              hideActions
              hideEmbed
              numberOfLines={3}
            />
          </Animated.View>
        )}
        <Animated.View className="w-full flex-row px-2" layout={Layout}>
          <View className="shrink-0 px-2">
            <Avatar />
          </View>
          <View className="flex flex-1 items-start px-2">
            <View className="min-h-[48px] flex-1 flex-row items-center">
              <TextInput
                ref={textRef}
                onChange={(evt) => {
                  setText(evt.nativeEvent.text);
                  if (send.isError) {
                    send.reset();
                  }
                }}
                multiline
                className="relative -top-px w-full text-lg leading-5"
                placeholder="What's on your mind?"
                placeholderTextColor={theme.dark ? "#555" : "#aaa"}
                verticalAlign="middle"
                textAlignVertical="center"
              >
                <RichText
                  size="lg"
                  text={rt.data?.text ?? text}
                  facets={rt.data?.facets}
                  truncate={false}
                  disableLinks
                />
              </TextInput>
            </View>
            <View className="w-full flex-row items-end justify-between">
              <TouchableOpacity
                className="mt-4 flex-row items-center"
                hitSlop={8}
                onPress={() => imagePicker.mutate()}
              >
                <Paperclip
                  size={18}
                  className={
                    theme.dark ? "text-neutral-400" : "text-neutral-500"
                  }
                />
                {images.length > 0 && (
                  <Animated.Text
                    className="ml-2"
                    style={{ color: theme.colors.text }}
                    entering={FadeIn}
                    exiting={FadeOut}
                  >
                    {images.length} / {MAX_IMAGES} images
                  </Animated.Text>
                )}
              </TouchableOpacity>
              {(rt.data?.graphemeLength ?? 0) > MAX_LENGTH * 0.66 && (
                <Animated.Text
                  style={{
                    color: !tooLong
                      ? theme.colors.text
                      : theme.colors.notification,
                  }}
                  entering={FadeIn}
                  exiting={FadeOut}
                  className="text-right font-medium"
                >
                  {rt.data?.graphemeLength} / {MAX_LENGTH}
                </Animated.Text>
              )}
            </View>
            {images.length > 0 && (
              <Animated.ScrollView
                horizontal
                className="mt-4 flex-1 pb-2"
                entering={FadeInDown}
                exiting={FadeOutDown}
              >
                {images.map((image, i) => (
                  <Animated.View
                    key={image.asset.uri}
                    className={cx(
                      "relative overflow-hidden rounded-md",
                      i !== 3 && "mr-2",
                    )}
                    layout={Layout}
                    exiting={FadeOut}
                  >
                    <Image
                      cachePolicy="memory"
                      source={{ uri: image.asset.uri }}
                      alt={`image ${i}}`}
                      className="h-36 w-36"
                    />
                    <TouchableOpacity
                      className="absolute left-2 top-2 z-10"
                      onPress={() => {
                        void Haptics.impactAsync();
                        Alert.prompt(
                          "Add a caption",
                          undefined,
                          (alt) => {
                            if (alt !== null) {
                              addAltText(i, alt);
                            }
                          },
                          undefined,
                          image.alt,
                        );
                      }}
                    >
                      <View className="flex-row items-center rounded-full bg-black/90 px-2 py-[3px]">
                        {image.alt ? (
                          <Check size={14} color="white" />
                        ) : (
                          <Plus size={14} color="white" />
                        )}
                        <Text className="ml-1 text-xs font-bold uppercase text-white">
                          Alt
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="absolute right-2 top-2 z-10"
                      onPress={() => {
                        void Haptics.impactAsync();
                        removeImage(i);
                      }}
                    >
                      <View className="rounded-full bg-black/90 p-1">
                        <X size={14} color="white" />
                      </View>
                    </TouchableOpacity>
                    {image.alt && (
                      <View className="absolute bottom-0 left-0 right-0 z-10 bg-black/60 px-3 pb-2 pt-1">
                        <Text
                          numberOfLines={2}
                          className="text-sm leading-[18px] text-white"
                        >
                          {image.alt}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                ))}
                {images.length < MAX_IMAGES && (
                  <Animated.View layout={Layout}>
                    <TouchableOpacity
                      onPress={() => {
                        void Haptics.impactAsync();
                        imagePicker.mutate();
                      }}
                    >
                      <View className="h-36 w-36 items-center justify-center rounded border border-neutral-200 dark:border-neutral-500">
                        <Plus color={theme.colors.text} />
                        <Text
                          style={{ color: theme.colors.text }}
                          className="mt-2 text-center"
                        >
                          Add image
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </Animated.ScrollView>
            )}
            {quote.thread.data && (
              <Animated.View
                layout={Layout}
                entering={FadeInDown}
                className="mt-4 w-full"
                pointerEvents="none"
              >
                <Embed
                  key={images.length + text}
                  uri=""
                  content={
                    {
                      $type: "app.bsky.embed.record#view",
                      record: {
                        $type: "app.bsky.embed.record#viewRecord",
                        ...quote.thread.data.post,
                        value: quote.thread.data.post.record,
                      },
                    } satisfies AppBskyEmbedRecord.View
                  }
                />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const PostButton = ({
  onPress,
  loading,
  disabled,
}: {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}) => {
  const theme = useTheme();

  return (
    <View className="flex-row items-center">
      <TouchableOpacity disabled={disabled} onPress={onPress}>
        <View
          className={cx(
            "relative flex-row items-center overflow-hidden rounded-full px-4 py-1",
            disabled && "opacity-50",
          )}
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="mr-2 text-base font-medium text-white">Post</Text>
          <Send size={12} className="text-white" />
          {loading && (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <ActivityIndicator size="small" color="white" />
            </Animated.View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const CancelButton = ({
  hasContent,
  onSave,
  disabled,
}: {
  hasContent: boolean;
  onSave: () => void;
  disabled?: boolean;
}) => {
  const theme = useTheme();
  const router = useRouter();

  if (hasContent) {
    return (
      <ContextMenuButton
        isMenuPrimaryAction={true}
        accessibilityLabel="Save or discard post"
        accessibilityRole="button"
        enableContextMenu={!disabled}
        menuConfig={{
          menuTitle: "",
          menuItems: [
            {
              actionKey: "save",
              actionTitle: "Save to drafts",
              icon: {
                type: "IMAGE_SYSTEM",
                imageValue: {
                  systemName: "square.and.arrow.down",
                },
              },
            },
            {
              actionKey: "discard",
              actionTitle: "Discard post",
              icon: {
                type: "IMAGE_SYSTEM",
                imageValue: {
                  systemName: "trash",
                },
              },
              menuAttributes: ["destructive"],
            },
          ],
        }}
        onPressMenuItem={(evt) => {
          switch (evt.nativeEvent.actionKey) {
            case "save":
              onSave();
              break;
            case "discard":
              router.push("../");
              break;
          }
        }}
      >
        <TouchableOpacity>
          <Text style={{ color: theme.colors.primary }} className="text-lg">
            Cancel
          </Text>
        </TouchableOpacity>
      </ContextMenuButton>
    );
  }

  return (
    <Link href="../" asChild>
      <TouchableOpacity>
        <Text style={{ color: theme.colors.primary }} className="text-lg">
          Cancel
        </Text>
      </TouchableOpacity>
    </Link>
  );
};
