import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Dashboard from "../pages/Dashboard";

import CourseList from "../pages/courses/CourseList";
import BatchList from "../pages/batches/BatchList";
import EnrollmentList from "../pages/enrollments/EnrollmentList";

import AddCourse from "../pages/courses/AddCourse";
import EditCourse from "../pages/courses/EditCourse";
import CourseDetails from "../pages/courses/CourseDetails";
//import BatchList from "../pages/batches/BatchList";

import AddBatch from "../pages/batches/AddBatch";
import BatchDetails from "../pages/batches/BatchDetails";
import EditBatch from "../pages/batches/EditBatch";

//import EnrollmentList from "../pages/enrollments/EnrollmentList";
import AddEnrollment from "../pages/enrollments/AddEnrollment";
import EditEnrollment from "../pages/enrollments/EditEnrollment";
import EnrollmentDetails from "../pages/enrollments/EnrollmentDetails";


function AppRoutes() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Layout />}>

          <Route index element={<Dashboard />} />

          <Route
            path="courses"
            element={<CourseList />}
          />

          <Route
            path="batches"
            element={<BatchList />}
          />

          <Route
            path="enrollments"
            element={<EnrollmentList />}
          />

        </Route>

        <Route
    path="courses/add"
    element={<AddCourse />}
/>

    <Route
  path="courses/edit/:id"
  element={<EditCourse />}
/>

    <Route
  path="courses/:id"
  element={<CourseDetails />}
/>

    <Route path="/batches"
     element={<BatchList />} />

     <Route path="/batches/add" 
     element={<AddBatch />} />

     <Route
  path="/batches/:id"
  element={<BatchDetails />}
/>

    <Route
  path="/batches/edit/:id"
  element={<EditBatch />}
/>

    <Route path="/enrollments" element={<EnrollmentList />} />
<Route path="/enrollments/add" element={<AddEnrollment />} />
<Route path="/enrollments/edit/:id" element={<EditEnrollment />} />
<Route path="/enrollments/:id" element={<EnrollmentDetails />} />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;