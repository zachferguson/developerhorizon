import { STORE_NAME } from "../config";
import "../styles/header.scss";

const Header = () => {
    return (
        <header className="header">
            <picture>
                <source srcSet="/desktoplogo.png" media="(min-width: 768px)" />
                <img
                    src="/mobilelogo.png"
                    alt={STORE_NAME}
                    className="logo"
                    style={{ maxWidth: "70%" }}
                />
            </picture>

            <p>
                Space, science, programming, robotics, and artificial
                intelligence themed clothing.
            </p>
        </header>
    );
};

export default Header;
