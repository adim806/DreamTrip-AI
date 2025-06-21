import { useEffect, useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// This component is needed because react-beautiful-dnd doesn't work well with React StrictMode
// This wrapper ensures components are only rendered once strict mode checks are complete
export function StrictModeDroppable(props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use a timer to delay enabling the droppable to avoid strict mode issues
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  // Use useMemo to wrap the Droppable component to avoid re-renders
  const content = useMemo(() => {
    // If not enabled yet, render placeholder
    if (!enabled) {
      return (
        <div
          data-rbd-droppable-id={props.droppableId || "placeholder"}
          data-rbd-droppable-context-id="0"
          style={{ minHeight: "100px" }}
        >
          <div></div>
        </div>
      );
    }

    // Explicitly extract and apply all props to avoid defaultProps issue
    const {
      children,
      droppableId,
      type = "DEFAULT",
      direction = "vertical",
      ignoreContainerClipping = false,
      isCombineEnabled = false,
      isDropDisabled = false,
      mode = "standard",
      ...otherProps
    } = props;

    // Return the Droppable with explicitly defined props
    return (
      <Droppable
        droppableId={droppableId}
        type={type}
        direction={direction}
        ignoreContainerClipping={ignoreContainerClipping}
        isCombineEnabled={isCombineEnabled}
        isDropDisabled={isDropDisabled}
        mode={mode}
        {...otherProps}
      >
        {children}
      </Droppable>
    );
  }, [enabled, props]);

  return content;
}

// Export the other components as well for convenience
export { DragDropContext, Draggable };
