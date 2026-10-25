import React from 'react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, details, confirmText = 'Confirm', confirmStyle = 'btn-danger', loading = false }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title || 'Confirm Action'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="confirm-dialog-body">
                    <p className="confirm-dialog-message">{message}</p>
                    {details && details.length > 0 && (
                        <div className="confirm-dialog-details">
                            <p className="confirm-dialog-impact">
                                ⚠️ Impact of this action:
                            </p>
                            <ul className="confirm-dialog-list">
                                {details.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                        </div>
                    )}
                    <p className="confirm-dialog-note">
                        This action cannot be undone.
                    </p>
                </div>
                <div className="confirm-dialog-actions">
                    <button className="btn btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
                    <button className={`btn ${confirmStyle}`} onClick={onConfirm} disabled={loading}>
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
