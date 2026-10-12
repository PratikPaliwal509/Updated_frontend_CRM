import React from 'react'

/** Same two-column layout as the existing login / register cover pages. */
const AuthCoverLayout = ({ image = '/images/auth/auth-cover-login-bg.svg', children }) => (
    <main className="auth-cover-wrapper">
        <div className="auth-cover-content-inner">
            <div className="auth-cover-content-wrapper">
                <div className="auth-img">
                    <img src={image} alt="" className="img-fluid" />
                </div>
            </div>
        </div>
        <div className="auth-cover-sidebar-inner">
            <div className="auth-cover-card-wrapper">
                <div className="auth-cover-card p-sm-5">
                    <div className="wd-50 mb-5">
                        <img src="/images/logo/techlal.png" alt="logo" className="img-fluid" />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    </main>
)

export default AuthCoverLayout
