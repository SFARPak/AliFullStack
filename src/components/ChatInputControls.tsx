import { ContextFilesPicker } from "./ContextFilesPicker";
import { ModelPicker } from "./ModelPicker";
import { ProModeSelector } from "./ProModeSelector";
import { ChatModeSelector } from "./ChatModeSelector";
import { ModePicker } from "./ModePicker";


export function ChatInputControls({
  showContextFilesPicker = false,
  appId,
}: {
  showContextFilesPicker?: boolean;
  appId?: number;
}) {
  return (
    <div className="flex">
      <ChatModeSelector appId={appId} />
      <div className="w-1.5"></div>
      <ModelPicker />
      <div className="w-1.5"></div>
      <ModePicker />
      <div className="w-1.5"></div>
      <ProModeSelector />
      <div className="w-1"></div>
      {showContextFilesPicker && (
        <>
          <ContextFilesPicker />
          <div className="w-0.5"></div>
        </>
      )}
    </div>
  );
}
