import "./FancyLoader.css";

const FancyLoader = ({ text = "Yuklanmoqda" }) => {
  return (
    <div className="fancy-loader">
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-text"><span>{text}</span></div>
      <div className="fancy-loader-line"></div>
    </div>
  );
};

export default FancyLoader;
