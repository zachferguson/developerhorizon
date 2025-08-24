import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Products from "./pages/Products";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Header from "./components/Header";
import NavBar from "./components/NavBar";
import Footer from "./components/Footer";
import Cart from "./pages/Cart";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import OrderStatus from "./pages/OrderStatus";
import ProductDetails from "./pages/ProductDetails";
import { useState } from "react";
import Modal from "./components/Modal";

const App = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<JSX.Element | null>(null);

    const openModal = (content: JSX.Element) => {
        setModalContent(content);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalContent(null);
    };
    return (
        <Router>
            <ToastContainer position="top-right" autoClose={3000} />
            <Header /> {/* Ensure Header is first */}
            <NavBar /> {/* Navbar should follow Header */}
            <main>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route
                        path="/product/:productId"
                        element={<ProductDetails openModal={openModal} />}
                    />
                    <Route
                        path="/checkout"
                        element={<Checkout openModal={openModal} />}
                    />
                    <Route path="/order-success" element={<OrderSuccess />} />
                    <Route path="/order-status" element={<OrderStatus />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
            <Modal isOpen={isModalOpen} onClose={closeModal}>
                {modalContent}
            </Modal>
        </Router>
    );
};

export default App;
