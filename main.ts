import { App, Plugin, PluginSettingTab, Setting, Notice, ItemView, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

const VIEW_TYPE_CHAT = 'perplexity-chat-view';

// Define the settings interface
interface PerplexityChatSettings {
    apiKey: string;
    modelName: string;
    temperature: number;       // New setting
    presencePenalty: number;   // New setting
    maxTokens: number;         // New setting
    systemPrompt: string;      // New setting for the system prompt
}

// Default settings
const DEFAULT_SETTINGS: PerplexityChatSettings = {
    apiKey: '',
    modelName: 'llama-3.1-sonar-small-128k-online',
    temperature: 0.2,          // Default value
    presencePenalty: 0,        // Default value
    maxTokens: 1000,           // Default value
    systemPrompt: '',          // Default system prompt
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
export default class PerplexityChatPlugin extends Plugin {
    settings!: PerplexityChatSettings;

    async onload() {
        await this.loadSettings(); // Load settings when the plugin is loaded

        // Register the chat view
        this.registerView(
            VIEW_TYPE_CHAT,
            (leaf) => new ChatView(leaf, this.settings.apiKey, this.settings.modelName, this)
        );

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
    }

    async onunload() {
        // Clean up (if needed)
    }

    async activateChatView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_CHAT);

        if (leaves.length > 0) {
            leaf = leaves[0]; // Reuse existing view if it exists
        } else {
            // Create a new leaf for the chat view
            leaf = workspace.getRightLeaf(false);
            if (leaf) { 
                await leaf.setViewState({ type: VIEW_TYPE_CHAT, active: true });
            }
        }

        if (leaf) { 
            workspace.revealLeaf(leaf);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// Chat View Class
export class ChatView extends ItemView {
    private apiKey: string;
    private modelName: string;
    private chatContainer: HTMLDivElement;
    private input: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private plugin: PerplexityChatPlugin; // Store reference to the plugin instance

    constructor(leaf: WorkspaceLeaf, apiKey: string, modelName: string, plugin: PerplexityChatPlugin) {
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

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();

        // Create a New Chat button above the chat container
        const newChatButton = container.createEl('button', { 
            text: 'New Chat', 
            cls: 'perplexity-new-chat-button' 
        });
        newChatButton.onclick = async () => {
            await this.plugin.loadSettings(); // Reload settings
            this.chatContainer.empty(); // Clear previous chat messages
        };

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
                } else {
                    // If only Enter is pressed, send the message
                    this.sendMessage();
                    event.preventDefault(); // Prevent the default action
                }
            }
        });
    }

    async onClose() {
        // Clear chat messages if needed
        this.chatContainer.empty();
    }

    async sendMessage() {
        const message = this.input.value.trim(); 
        if (!message) {
            new Notice('Please enter a message.');
            return;
        }

        this.addChatMessage(message, 'user'); 

        // Clear input field
        this.input.value = '';

        try {
            const response = await this.fetchResponse(message);
            const responseContent = response.choices?.[0]?.message?.content;

            if (responseContent) {
                this.addChatMessage(responseContent, 'bot'); 
            } else {
                new Notice("No response from Perplexity API.");
            }
        } catch (error: any) {
            new Notice('Error fetching response: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    addChatMessage(message: string, role: 'user' | 'bot') {
        const messageDiv = this.chatContainer.createDiv({ cls: `perplexity-chat-message ${role}` });
        let formattedMessage = message;

        // Add the message rendered as markdown
        const messageContentDiv = messageDiv.createDiv({ cls: 'message-content' });
        const activeFile = this.app.workspace.getActiveFile();
        const path = activeFile ? activeFile.path : ''; 
        MarkdownRenderer.renderMarkdown(formattedMessage, messageContentDiv, path, this);

        // Create the copy button for this message
        const copyButton = messageDiv.createEl('button', { text: 'Copy', cls: 'perplexity-copy-btn' });
        copyButton.onclick = () => {
            navigator.clipboard.writeText(message).then(() => {
                new Notice('Message copied to clipboard!');
            });
        };
        messageDiv.appendChild(copyButton);
    }

    async fetchResponse(message: string) {
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
                    { role: 'system', content: this.plugin.settings.systemPrompt }, // Use custom system prompt
                    { role: 'user', content: message },
                ],
                temperature: this.plugin.settings.temperature, // Use temperature from settings
                presence_penalty: this.plugin.settings.presencePenalty, // Use presence_penalty from settings
                max_tokens: this.plugin.settings.maxTokens, // Use max_tokens from settings
            }),
        };

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', options);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (error: unknown) {
            throw new Error(`Failed to fetch response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Settings Tab Class
class PerplexityChatSettingTab extends PluginSettingTab {
    plugin: PerplexityChatPlugin;

    constructor(app: App, plugin: PerplexityChatPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // API Key Setting
        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Enter your Perplexity API key')
            .addText(text => 
                text
                    .setPlaceholder('Enter API key')
                    .setValue(this.plugin.settings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.apiKey = value;
                        await this.plugin.saveSettings(); // Save settings when API key changes
                    }));

        // Model Name Dropdown
        new Setting(containerEl)
            .setName('Model Name')
            .setDesc('Select the model to use (default: llama-3.1-sonar-small-128k-online)')
            .addDropdown(dropdown => 
                dropdown
                    .addOptions(
                        AVAILABLE_MODELS.reduce((acc: { [key: string]: string }, model) => {
                            acc[model] = model; // Set each model as a key-value pair
                            return acc;
                        }, {})
                    )
                    .setValue(this.plugin.settings.modelName)
                    .onChange(async (value) => {
                        this.plugin.settings.modelName = value; // Update model name in settings
                        await this.plugin.saveSettings(); // Save settings when model name changes
                    }));

        // Temperature Setting
        new Setting(containerEl)
            .setName('Temperature')
            .setDesc('Controls randomness in the response (0 to 2)')
            .addText(text => 
                text
                    .setValue(this.plugin.settings.temperature.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.temperature = parseFloat(value);
                        await this.plugin.saveSettings();
                    }));

        // Presence Penalty Setting
        new Setting(containerEl)
            .setName('Presence Penalty')
            .setDesc('Penalize new tokens based on whether they appear in the text (range: -2 to 2)')
            .addText(text => 
                text
                    .setValue(this.plugin.settings.presencePenalty.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.presencePenalty = parseFloat(value);
                        await this.plugin.saveSettings();
                    }));

        // Max Tokens Setting
        new Setting(containerEl)
            .setName('Max Tokens')
            .setDesc('The maximum number of tokens to generate')
            .addText(text => 
                text
                    .setValue(this.plugin.settings.maxTokens.toString())
                    .onChange(async (value) => {
                        this.plugin.settings.maxTokens = parseInt(value);
                        await this.plugin.saveSettings();
                    }));

        // System Prompt Setting
        new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Custom system prompt for API (default: empty string)')
            .addText(text => 
                text
                    .setValue(this.plugin.settings.systemPrompt)
                    .onChange(async (value) => {
                        this.plugin.settings.systemPrompt = value;
                        await this.plugin.saveSettings();
                    }));
    }
}