import { useNavigate } from "react-router-dom";
import { Ic, I } from "../../components/Icon";
import "./TutorialPage.css";

const STEPS = [
  ["1", "Browse the Photos", "On the main gallery page, all the family photos are laid out in a grid. Scroll down to see more. Click any photo to see it up close and read any notes that have been left."],
  ["2", "Filter by Category", "Use the row of buttons (Family, Garden, Holidays\u2026) to show only certain types of photos. Click \u2018All\u2019 to see everything again."],
  ["3", "Sign In to Add Notes", "Click the \u2018Sign In\u2019 button in the top right corner. Enter your email address and password \u2014 the same ones your grandchild set up for you."],
  ["4", "Write a Note", "Once signed in and viewing a photo, scroll down to find the note box. Type your memory or description, then press the green \u2018Save Note\u2019 button."],
  ["5", "Record a Voice Memory", "Below the note box you\u2019ll find the voice recording area. Press \u2018Start Recording\u2019, speak your story, then press \u2018Stop\u2019. Listen back, and if you\u2019re happy, press \u2018Save Voice Note\u2019!"],
  ["6", "Go Back to All Photos", "Press the \u2018\u2190 Back to Gallery\u2019 button at the top of any photo page to return to all the photos."],
];

export default function TutorialPage() {
  const navigate = useNavigate();

  return (
    <div className="tpage">
      <div className="hero">
        <h1>How to Use This Website</h1>
        <div className="divider" />
        <p>Follow these simple steps to browse photos and leave your memories!</p>
      </div>
      <div className="tip">
        <div className="ti">💡</div>
        <div className="tt"><strong>Tip:</strong> Make text bigger by pressing <strong>Ctrl +</strong> (or <strong>Cmd +</strong> on a Mac)!</div>
      </div>
      {STEPS.map(([n, title, text]) => (
        <div key={n} className="tstep">
          <div className="snum">{n}</div>
          <div className="scnt"><h3>{title}</h3><p>{text}</p></div>
        </div>
      ))}
      <div className="tip">
        <div className="ti">🌸</div>
        <div className="tt"><strong>Need help?</strong> If anything isn&apos;t working, don&apos;t hesitate to ask — this was made with love, just for you!</div>
      </div>
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button className="btn bp blg" onClick={() => navigate("/")}><Ic d={I.img} s={20} /> Go to the Photos</button>
      </div>
    </div>
  );
}
