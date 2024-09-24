import React from 'react';
import { createPortal } from 'react-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import './PickNameModal.css';

interface PickNameModalProps {
  onNameSubmit: (name: string) => void;
}

const validationSchema = Yup.object({
  name: Yup.string()
    .min(1, 'Must have at least 1 character')
    .max(14, 'Must be 14 characters or less')
    .required('Required'),
});

const PickNameModal: React.FC<PickNameModalProps> = ({ onNameSubmit }) => {
  const initialName = localStorage.getItem('hostName') || ''; // Always fetch from local storage
  return createPortal(
    <div className="pickNameModal">
      <div className="modalContent">
        {/* Seems to have broke. */}
        <h2>Pick a Name</h2>

        <Formik
          initialValues={{ name: initialName }}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            onNameSubmit(values.name);
          }}
        >
          {() => (
            <Form>
              <Field
                type="text"
                name="name"
                placeholder="Enter your name"
              />
              <ErrorMessage name="name" component="div" className="error" />
              <button type="submit">Submit</button>
            </Form>
          )}
        </Formik>
      </div>
    </div>,
    document.getElementById('root')!
  );
};

export default PickNameModal;
