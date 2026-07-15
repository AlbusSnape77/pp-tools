import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nContext";
import { createLocalChatClient } from "./localChatClient";
import "./local-chat.css";


const DEFAULT_SYSTEM_PROMPT = "你是一个可靠的本地编程助手。请使用中文回答，代码要完整且可运行。";

export default function LocalChatPage({ client, onBack = () => {} }) {
  const { t } = useI18n();
  const chatClient = useMemo(() => client || createLocalChatClient(), [client]);
  const [connection, setConnection] = useState("connecting");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [maxTokens, setMaxTokens] = useState(512);
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const activeRequest = useRef(null);

  useEffect(() => {
    let active = true;
    chatClient.start()
      .then(() => active && setConnection("connected"))
      .catch(() => active && setConnection("offline"));
    return () => { active = false; };
  }, [chatClient]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const content = input.trim();
    if (!content || generating || connection === "offline") return;

    const requestId = `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const userMessage = { id: `${requestId}-user`, role: "user", content };
    const assistantId = `${requestId}-assistant`;
    const assistantMessage = { id: assistantId, role: "assistant", content: "" };
    const context = messages
      .map(({ role, content: messageContent }) => ({ role, content: messageContent }))
      .filter(({ content: messageContent }) => messageContent.trim());
    activeRequest.current = requestId;
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
    setGenerating(true);

    try {
      for await (const eventItem of chatClient.chat({
        request_id: requestId,
        messages: [
          ...(systemPrompt.trim() ? [{ role: "system", content: systemPrompt.trim() }] : []),
          ...context,
          { role: "user", content },
        ],
        max_new_tokens: Number(maxTokens),
        temperature: Number(temperature),
        top_p: Number(topP),
      })) {
        if (eventItem.type === "status") {
          setConnection(eventItem.status === "loading" ? "loading" : "connected");
        } else if (eventItem.type === "delta") {
          setMessages((current) => current.map((message) => (
            message.id === assistantId
              ? { ...message, content: message.content + eventItem.text }
              : message
          )));
        } else if (eventItem.type === "error") {
          setMessages((current) => current.map((message) => (
            message.id === assistantId
              ? { ...message, content: t("localChat.error", { message: eventItem.message }) }
              : message
          )));
        }
      }
    } catch (error) {
      setMessages((current) => current.map((message) => (
        message.id === assistantId
          ? { ...message, content: t("localChat.error", { message: error.message }) }
          : message
      )));
    } finally {
      activeRequest.current = null;
      setGenerating(false);
      setConnection((current) => current === "loading" ? "connected" : current);
    }
  };

  const stopReply = async () => {
    const requestId = activeRequest.current;
    if (!requestId) return;
    await chatClient.cancel(requestId);
  };

  const releaseModel = async () => {
    if (generating) return;
    try {
      await chatClient.unload();
      setConnection("released");
    } catch {
      setConnection("offline");
    }
  };

  return (
    <main className="local-chat-page">
      <header className="local-chat-header">
        <button className="embed-back" type="button" onClick={onBack}>{t("common.back")}</button>
        <div>
          <p className="local-chat-kicker">QWEN · LOCAL</p>
          <h1>{t("localChat.title")}</h1>
          <p>{t("localChat.intro")}</p>
        </div>
        <span className={`local-chat-status is-${connection}`} role="status">
          {t(`localChat.connection.${connection}`)}
        </span>
      </header>

      <div className="local-chat-workspace">
        <aside className="local-chat-sidebar">
          <div className="local-chat-actions">
            <button type="button" disabled={!messages.length || generating} onClick={() => setMessages([])}>
              {t("localChat.clear")}
            </button>
            <button type="button" disabled={generating} onClick={releaseModel}>
              {t("localChat.unload")}
            </button>
          </div>
          <details className="local-chat-settings">
            <summary>{t("localChat.settings.title")}</summary>
            <label>
              <span>{t("localChat.settings.systemPrompt")}</span>
              <textarea value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} />
            </label>
            <label>
              <span>{t("localChat.settings.maxTokens")}</span>
              <input type="number" min="32" max="2048" step="32" value={maxTokens} onChange={(event) => setMaxTokens(event.target.value)} />
            </label>
            <label>
              <span>{t("localChat.settings.temperature")}</span>
              <input type="number" min="0" max="2" step="0.1" value={temperature} onChange={(event) => setTemperature(event.target.value)} />
            </label>
            <label>
              <span>{t("localChat.settings.topP")}</span>
              <input type="number" min="0.1" max="1" step="0.1" value={topP} onChange={(event) => setTopP(event.target.value)} />
            </label>
          </details>
          <p className="local-chat-privacy">{t("localChat.privacy")}</p>
        </aside>

        <section className="local-chat-panel" aria-label={t("localChat.conversation")}>
          <div className="local-chat-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="local-chat-empty">
                <strong>{t("localChat.welcomeTitle")}</strong>
                <p>{t("localChat.welcomeText")}</p>
              </div>
            ) : messages.map((message) => (
              <article className={`local-chat-message is-${message.role}`} key={message.id}>
                <span>{t(`localChat.roles.${message.role}`)}</span>
                <div>{message.content || t("localChat.thinking")}</div>
              </article>
            ))}
          </div>
          <form className="local-chat-composer" onSubmit={sendMessage}>
            <textarea
              placeholder={t("localChat.placeholder")}
              aria-label={t("localChat.messageLabel")}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) sendMessage(event);
              }}
            />
            {generating ? (
              <button type="button" onClick={stopReply}>{t("localChat.stop")}</button>
            ) : (
              <button type="submit" disabled={!input.trim() || connection === "offline"}>{t("localChat.send")}</button>
            )}
          </form>
        </section>
      </div>
    </main>
  );
}
