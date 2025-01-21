import React from 'react'

const LeftContainer = () => {
  return (
    <div
      style={{
        flex: 1, // Take up half the width
        height: "100%", // Full height of parent
        boxSizing: "border-box", // Ensure borders are included in dimensions
        background: "blue",
      }}
    >
      <p>hey hey hey</p>
    </div>
  );
};
export default LeftContainer;
