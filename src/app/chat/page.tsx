import ChatBox from "@/components/ChatBox";
export const metadata = { title: "Help chat" };
export default function Chat() {
  return (<><h1>Help chat</h1>
    <p className="muted">Automated answers from fixed help text and published listings. Advanced AI is not enabled. See the <a href="/legal/ai-chatbot">AI chatbot disclosure</a>.</p>
    <ChatBox /></>);
}
