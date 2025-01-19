import React, { useState, useEffect } from "react";
import Layout from "@theme/Layout";

const Hello: React.FC = () => {
  const [squareColor, setSquareColor] = useState("blue");
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => {
    console.log(`颜色改变为: ${squareColor}`);
  }, [squareColor]);

  const handleClick = () => {
    setSquareColor(squareColor === "blue" ? "red" : "blue");
    setClickCount((prev1Count) => prev1Count + 1);
  };

  return (
    <Layout title="Hello" description="Hello React Page">
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
          fontSize: "20px",
          gap: "20px",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            backgroundColor: squareColor,
            transition: "background-color 0.3s",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleClick}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            改变颜色
          </button>
          <p>按钮已被点击 {clickCount} 次</p>
        </div>
      </div>
    </Layout>
  );
};

export default Hello;
