"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var main_exports = {};
__export(main_exports, {
  ChatView: () => ChatView,
  default: () => PerplexityChatPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
const VIEW_TYPE_CHAT = "perplexity-chat-view";
const DEFAULT_SETTINGS = {
  apiKey: "",
  modelName: "llama-3.1-sonar-small-128k-online",
  temperature: 0.2,
  // Default value
  presencePenalty: 0,
  // Default value
  maxTokens: 1e3,
  // Default value
  systemPrompt: ""
  // Default system prompt
};
const AVAILABLE_MODELS = [
  "llama-3.1-sonar-small-128k-chat",
  "llama-3.1-sonar-small-128k-online",
  "llama-3.1-sonar-large-128k-chat",
  "llama-3.1-sonar-large-128k-online",
  "llama-3.1-8b-instruct",
  "llama-3.1-70b-instruct"
];
class PerplexityChatPlugin extends import_obsidian.Plugin {
  onload() {
    return __async(this, null, function* () {
      yield this.loadSettings();
      this.registerView(
        VIEW_TYPE_CHAT,
        (leaf) => new ChatView(leaf, this.settings.apiKey, this.settings.modelName, this)
      );
      this.addRibbonIcon("dice", "Open Perplexity Chat", () => {
        this.activateChatView();
      });
      this.addCommand({
        id: "open-perplexity-chat-view",
        name: "Open Perplexity Chat View",
        callback: () => this.activateChatView()
      });
      this.addSettingTab(new PerplexityChatSettingTab(this.app, this));
    });
  }
  onunload() {
    return __async(this, null, function* () {
    });
  }
  activateChatView() {
    return __async(this, null, function* () {
      const { workspace } = this.app;
      let leaf = null;
      const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);
      if (leaves.length > 0) {
        leaf = leaves[0];
      } else {
        leaf = workspace.getRightLeaf(false);
        if (leaf) {
          yield leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
        }
      }
      if (leaf) {
        workspace.revealLeaf(leaf);
      }
    });
  }
  loadSettings() {
    return __async(this, null, function* () {
      this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
    });
  }
  saveSettings() {
    return __async(this, null, function* () {
      yield this.saveData(this.settings);
    });
  }
}
class ChatView extends import_obsidian.ItemView {
  // Store reference to the plugin instance
  constructor(leaf, apiKey, modelName, plugin) {
    super(leaf);
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.plugin = plugin;
    this.chatContainer = document.createElement("div");
    this.input = document.createElement("textarea");
    this.sendButton = document.createElement("button");
  }
  getViewType() {
    return VIEW_TYPE_CHAT;
  }
  getDisplayText() {
    return "Perplexity Chat";
  }
  onOpen() {
    return __async(this, null, function* () {
      const container = this.containerEl.children[1];
      container.empty();
      const newChatButton = container.createEl("button", {
        text: "New Chat",
        cls: "perplexity-new-chat-button"
      });
      newChatButton.onclick = () => __async(this, null, function* () {
        yield this.plugin.loadSettings();
        this.chatContainer.empty();
      });
      newChatButton.style.marginBottom = "10px";
      newChatButton.style.display = "block";
      this.chatContainer.addClass("perplexity-chat-container");
      container.appendChild(this.chatContainer);
      const inputWrapper = container.createDiv({ cls: "input-wrapper" });
      this.input = inputWrapper.createEl("textarea", {
        cls: "perplexity-chat-input",
        placeholder: "Type your message..."
      });
      inputWrapper.appendChild(this.input);
      this.sendButton = inputWrapper.createEl("button", { text: "Send", cls: "perplexity-send-button" });
      inputWrapper.appendChild(this.sendButton);
      container.appendChild(inputWrapper);
      this.sendButton.onclick = () => this.sendMessage();
      this.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          if (event.shiftKey) {
            const start = this.input.selectionStart;
            const end = this.input.selectionEnd;
            const value = this.input.value;
            this.input.value = value.substring(0, start) + "\n" + value.substring(end);
            this.input.selectionStart = this.input.selectionEnd = start + 1;
            event.preventDefault();
          } else {
            this.sendMessage();
            event.preventDefault();
          }
        }
      });
    });
  }
  onClose() {
    return __async(this, null, function* () {
      this.chatContainer.empty();
    });
  }
  sendMessage() {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const message = this.input.value.trim();
      if (!message) {
        new import_obsidian.Notice("Please enter a message.");
        return;
      }
      this.addChatMessage(message, "user");
      this.input.value = "";
      try {
        const response = yield this.fetchResponse(message);
        const responseContent = (_c = (_b = (_a = response.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content;
        if (responseContent) {
          this.addChatMessage(responseContent, "bot");
        } else {
          new import_obsidian.Notice("No response from Perplexity API.");
        }
      } catch (error) {
        new import_obsidian.Notice("Error fetching response: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    });
  }
  addChatMessage(message, role) {
    const messageDiv = this.chatContainer.createDiv({ cls: `perplexity-chat-message ${role}` });
    let formattedMessage = message;
    const messageContentDiv = messageDiv.createDiv({ cls: "message-content" });
    const activeFile = this.app.workspace.getActiveFile();
    const path = activeFile ? activeFile.path : "";
    import_obsidian.MarkdownRenderer.renderMarkdown(formattedMessage, messageContentDiv, path, this);
    const copyButton = messageDiv.createEl("button", { text: "Copy", cls: "perplexity-copy-btn" });
    copyButton.onclick = () => {
      navigator.clipboard.writeText(message).then(() => {
        new import_obsidian.Notice("Message copied to clipboard!");
      });
    };
    messageDiv.appendChild(copyButton);
  }
  fetchResponse(message) {
    return __async(this, null, function* () {
      const options = {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
          // Include the API key
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: "system", content: this.plugin.settings.systemPrompt },
            // Use custom system prompt
            { role: "user", content: message }
          ],
          temperature: this.plugin.settings.temperature,
          // Use temperature from settings
          presence_penalty: this.plugin.settings.presencePenalty,
          // Use presence_penalty from settings
          max_tokens: this.plugin.settings.maxTokens
          // Use max_tokens from settings
        })
      };
      try {
        const response = yield fetch("https://api.perplexity.ai/chat/completions", options);
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = yield response.json();
        return data;
      } catch (error) {
        throw new Error(`Failed to fetch response: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  }
}
class PerplexityChatSettingTab extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian.Setting(containerEl).setName("API Key").setDesc("Enter your Perplexity API key").addText((text) => text.setPlaceholder("Enter API key").setValue(this.plugin.settings.apiKey).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.apiKey = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Model Name").setDesc("Select the model to use (default: llama-3.1-sonar-small-128k-online)").addDropdown((dropdown) => dropdown.addOptions(
      AVAILABLE_MODELS.reduce((acc, model) => {
        acc[model] = model;
        return acc;
      }, {})
    ).setValue(this.plugin.settings.modelName).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.modelName = value;
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Temperature").setDesc("Controls randomness in the response (0 to 2)").addText((text) => text.setValue(this.plugin.settings.temperature.toString()).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.temperature = parseFloat(value);
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Presence Penalty").setDesc("Penalize new tokens based on whether they appear in the text (range: -2 to 2)").addText((text) => text.setValue(this.plugin.settings.presencePenalty.toString()).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.presencePenalty = parseFloat(value);
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("Max Tokens").setDesc("The maximum number of tokens to generate").addText((text) => text.setValue(this.plugin.settings.maxTokens.toString()).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.maxTokens = parseInt(value);
      yield this.plugin.saveSettings();
    })));
    new import_obsidian.Setting(containerEl).setName("System Prompt").setDesc("Custom system prompt for API (default: empty string)").addText((text) => text.setValue(this.plugin.settings.systemPrompt).onChange((value) => __async(this, null, function* () {
      this.plugin.settings.systemPrompt = value;
      yield this.plugin.saveSettings();
    })));
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatView
});
