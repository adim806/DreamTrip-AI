import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// This component is needed because react-beautiful-dnd doesn't work well with React StrictMode
// This wrapper ensures components are only rendered once strict mode checks are complete
export function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Use a timer to delay enabling the droppable to avoid strict mode issues
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

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

  // Return the Droppable with all props
  return <Droppable {...props}>{children}</Droppable>;
}

// Similar wrapper for Draggable to handle strict mode issues
export function StrictModeDraggable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  // If not enabled yet, render placeholder
  if (!enabled) {
    return (
      <div
        data-rbd-draggable-id={props.draggableId || "placeholder"}
        data-rbd-draggable-context-id="0"
        style={{ visibility: "hidden" }}
      >
        {typeof children === 'function' ? children({
          draggableProps: {},
          dragHandleProps: null,
          innerRef: () => {},
        }) : <div></div>}
      </div>
    );
  }

  // Return the Draggable with all props
  return <Draggable {...props}>{children}</Draggable>;
}

// Export DragDropContext directly
export { DragDropContext };
