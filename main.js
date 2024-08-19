"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatView = void 0;
const obsidian_1 = require("obsidian");
const VIEW_TYPE_CHAT = 'perplexity-chat-view';
// Default settings
const DEFAULT_SETTINGS = {
    apiKey: '',
    modelName: 'llama-3.1-sonar-small-128k-online',
    temperature: 0.2,
    presencePenalty: 0,
    maxTokens: 1000,
    systemPrompt: '', // Default system prompt
};
// Available models
const AVAILABLE_MODELS = [
    'llama-3.1-sonar-small-128k-chat',
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-chat',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-8b-instruct',
    'llama-3.1-70b-instruct',
];
// Main Plugin Class
class PerplexityChatPlugin extends obsidian_1.Plugin {
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.loadSettings(); // Load settings when the plugin is loaded
            // Register the chat view
            this.registerView(VIEW_TYPE_CHAT, (leaf) => new ChatView(leaf, this.settings.apiKey, this.settings.modelName, this));
            // Add a ribbon icon to activate the chat view
            this.addRibbonIcon('dice', 'Open Perplexity Chat', () => {
                this.activateChatView();
            });
            // Add command to open the chat view
            this.addCommand({
                id: 'open-perplexity-chat-view',
                name: 'Open Perplexity Chat View',
                callback: () => this.activateChatView(),
            });
            // Add settings tab for the plugin
            this.addSettingTab(new PerplexityChatSettingTab(this.app, this));
        });
    }
    onunload() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clean up (if needed)
        });
    }
    activateChatView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.app;
            let leaf = null;
            const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);
            if (leaves.length > 0) {
                leaf = leaves[0]; // Reuse existing view if it exists
            }
            else {
                // Create a new leaf for the chat view
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
        return __awaiter(this, void 0, void 0, function* () {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, yield this.loadData());
        });
    }
    saveSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.saveData(this.settings);
        });
    }
}
exports.default = PerplexityChatPlugin;
// Chat View Class
class ChatView extends obsidian_1.ItemView {
    constructor(leaf, apiKey, modelName, plugin) {
        super(leaf);
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.plugin = plugin; // Store the plugin reference
        this.chatContainer = document.createElement('div');
        this.input = document.createElement('textarea');
        this.sendButton = document.createElement('button');
    }
    getViewType() {
        return VIEW_TYPE_CHAT;
    }
    getDisplayText() {
        return "Perplexity Chat";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            const container = this.containerEl.children[1];
            container.empty();
            // Create a New Chat button above the chat container
            const newChatButton = container.createEl('button', {
                text: 'New Chat',
                cls: 'perplexity-new-chat-button'
            });
            newChatButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
                yield this.plugin.loadSettings(); // Reload settings
                this.chatContainer.empty(); // Clear previous chat messages
            });
            // Styling for the New Chat button
            newChatButton.style.marginBottom = '10px'; // Add bottom margin for spacing
            newChatButton.style.display = 'block'; // Ensure the button takes full width for clean layout
            // Set up the chat container with appropriate classes
            this.chatContainer.addClass('perplexity-chat-container');
            container.appendChild(this.chatContainer); // Append the chat container to the main container
            // Create a wrapper for the input area
            const inputWrapper = container.createDiv({ cls: 'input-wrapper' });
            // Create the text area input
            this.input = inputWrapper.createEl('textarea', {
                cls: 'perplexity-chat-input',
                placeholder: 'Type your message...'
            });
            inputWrapper.appendChild(this.input); // Add input to the input wrapper
            // Create the send button
            this.sendButton = inputWrapper.createEl('button', { text: 'Send', cls: 'perplexity-send-button' });
            inputWrapper.appendChild(this.sendButton); // Add send button to the input wrapper
            // Append input wrapper to the main container
            container.appendChild(inputWrapper);
            // Set the send button's onclick functionality
            this.sendButton.onclick = () => this.sendMessage();
            // Add keydown event listener to the input field
            this.input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    if (event.shiftKey) {
                        // If Shift + Enter is pressed, insert a newline
                        const start = this.input.selectionStart;
                        const end = this.input.selectionEnd;
                        const value = this.input.value;
                        this.input.value = value.substring(0, start) + "\n" + value.substring(end);
                        this.input.selectionStart = this.input.selectionEnd = start + 1; // Move cursor after newline
                        event.preventDefault(); // Prevent the default action
                    }
                    else {
                        // If only Enter is pressed, send the message
                        this.sendMessage();
                        event.preventDefault(); // Prevent the default action
                    }
                }
            });
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear chat messages if needed
            this.chatContainer.empty();
        });
    }
    sendMessage() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const message = this.input.value.trim();
            if (!message) {
                new obsidian_1.Notice('Please enter a message.');
                return;
            }
            this.addChatMessage(message, 'user');
            // Clear input field
            this.input.value = '';
            try {
                const response = yield this.fetchResponse(message);
                const responseContent = (_c = (_b = (_a = response.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
                if (responseContent) {
                    this.addChatMessage(responseContent, 'bot');
                }
                else {
                    new obsidian_1.Notice("No response from Perplexity API.");
                }
            }
            catch (error) {
                new obsidian_1.Notice('Error fetching response: ' + (error instanceof Error ? error.message : 'Unknown error'));
            }
        });
    }
    addChatMessage(message, role) {
        const messageDiv = this.chatContainer.createDiv({ cls: `perplexity-chat-message ${role}` });
        let formattedMessage = message;
        // Add the message rendered as markdown
        const messageContentDiv = messageDiv.createDiv({ cls: 'message-content' });
        const activeFile = this.app.workspace.getActiveFile();
        const path = activeFile ? activeFile.path : '';
        obsidian_1.MarkdownRenderer.renderMarkdown(formattedMessage, messageContentDiv, path, this);
        // Create the copy button for this message
        const copyButton = messageDiv.createEl('button', { text: 'Copy', cls: 'perplexity-copy-btn' });
        copyButton.onclick = () => {
            navigator.clipboard.writeText(message).then(() => {
                new obsidian_1.Notice('Message copied to clipboard!');
            });
        };
        messageDiv.appendChild(copyButton);
    }
    fetchResponse(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`, // Include the API key
                },
                body: JSON.stringify({
                    model: this.modelName,
                    messages: [
                        { role: 'system', content: this.plugin.settings.systemPrompt },
                        { role: 'user', content: message },
                    ],
                    temperature: this.plugin.settings.temperature,
                    presence_penalty: this.plugin.settings.presencePenalty,
                    max_tokens: this.plugin.settings.maxTokens, // Use max_tokens from settings
                }),
            };
            try {
                const response = yield fetch('https://api.perplexity.ai/chat/completions', options);
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                const data = yield response.json();
                return data;
            }
            catch (error) {
                throw new Error(`Failed to fetch response: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
}
exports.ChatView = ChatView;
// Settings Tab Class
class PerplexityChatSettingTab extends obsidian_1.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        // API Key Setting
        new obsidian_1.Setting(containerEl)
            .setName('API Key')
            .setDesc('Enter your Perplexity API key')
            .addText(text => text
            .setPlaceholder('Enter API key')
            .setValue(this.plugin.settings.apiKey)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.apiKey = value;
            yield this.plugin.saveSettings(); // Save settings when API key changes
        })));
        // Model Name Dropdown
        new obsidian_1.Setting(containerEl)
            .setName('Model Name')
            .setDesc('Select the model to use (default: llama-3.1-sonar-small-128k-online)')
            .addDropdown(dropdown => dropdown
            .addOptions(AVAILABLE_MODELS.reduce((acc, model) => {
            acc[model] = model; // Set each model as a key-value pair
            return acc;
        }, {}))
            .setValue(this.plugin.settings.modelName)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.modelName = value; // Update model name in settings
            yield this.plugin.saveSettings(); // Save settings when model name changes
        })));
        // Temperature Setting
        new obsidian_1.Setting(containerEl)
            .setName('Temperature')
            .setDesc('Controls randomness in the response (0 to 2)')
            .addText(text => text
            .setValue(this.plugin.settings.temperature.toString())
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.temperature = parseFloat(value);
            yield this.plugin.saveSettings();
        })));
        // Presence Penalty Setting
        new obsidian_1.Setting(containerEl)
            .setName('Presence Penalty')
            .setDesc('Penalize new tokens based on whether they appear in the text (range: -2 to 2)')
            .addText(text => text
            .setValue(this.plugin.settings.presencePenalty.toString())
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.presencePenalty = parseFloat(value);
            yield this.plugin.saveSettings();
        })));
        // Max Tokens Setting
        new obsidian_1.Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('The maximum number of tokens to generate')
            .addText(text => text
            .setValue(this.plugin.settings.maxTokens.toString())
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.maxTokens = parseInt(value);
            yield this.plugin.saveSettings();
        })));
        // System Prompt Setting
        new obsidian_1.Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Custom system prompt for API (default: empty string)')
            .addText(text => text
            .setValue(this.plugin.settings.systemPrompt)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            this.plugin.settings.systemPrompt = value;
            yield this.plugin.saveSettings();
        })));
    }
}
