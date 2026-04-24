import { FaceRegistration } from "@/components/student/face-registration";

export default function RegisterFacePage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Complete Your Profile
          </h1>
          <p className="text-muted-foreground text-lg">
            Register your facial biometrics to enable automated attendance tracking.
          </p>
        </div>
        
        <FaceRegistration />
      </div>
    </div>
  );
}
