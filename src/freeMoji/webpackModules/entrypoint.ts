import { EmojiStore, SelectedGuildStore } from "@moonlight-mod/wp/common_stores";
import spacepack from "@moonlight-mod/wp/spacepack_spacepack";

const logger = moonlight.getLogger("freeMoji/entrypoint");
logger.info("Hello from freeMoji/entrypoint!");

interface Message {
    content: string;
    // TODO: Get the proper type for this
    invalidEmojis: any[];
}

const COOL = "Queueing message to be sent";
const module = spacepack.findByCode(COOL)[0].exports;

const originalSend = module.Z.sendMessage;
module.Z.sendMessage = async (...args: any[]) => {
    modifyIfNeeded(args[1]);
    return originalSend.call(module.Z, ...args);
};

// https://github.com/luimu64/nitro-spoof/blob/1bb75a2471c39669d590bfbabeb7b922672929f5/index.js#L25
const hasEmotesRegex = /<a?:(\w+):(\d+)>/i;

function extractUnusableEmojis(messageString: string, size: number) {
    const emojiStrings = messageString.matchAll(/<a?:(\w+):(\d+)>/gi);

    for (const emojiString of emojiStrings) {
        // Fetch required info about the emoji
        const emoji = EmojiStore.getCustomEmojiById(emojiString[2]);

        // Check emoji usability
        if (emoji.guildId !== SelectedGuildStore.getGuildId() || emoji.animated) {
            // Replace the discord emoji format with the corresponding emoji url
            messageString = messageString.replace(
                emojiString[0],
                `[${emoji.allNamesString.replace(":", "")}](https://cdn.discordapp.com/emojis/${emoji.id}.webp?size=48${emoji.animated ? "&animated=true" : ""})`
            );
        }
    }

    return {
        newContent: messageString.trim()
    };
}

export default function modifyIfNeeded(msg: Message) {
    if (!msg.content.match(hasEmotesRegex)) return;

    // Find all emojis from the captured message string and return object with emojiURLS and content
    const { newContent } = extractUnusableEmojis(msg.content, 48);

    msg.content = newContent;

    // Set invalidEmojis to empty to prevent Discord yelling to you about you not having nitro
    msg.invalidEmojis = [];
}
