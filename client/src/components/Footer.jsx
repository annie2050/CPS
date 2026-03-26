import './Footer.css'

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-text">
          © {new Date().getFullYear()} All rights reserved to Guljag Infotech
        </span>
      </div>
    </footer>
  )
}

export default Footer
