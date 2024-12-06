import { exercises } from '@/app/services/exercises';
import App from '@/app/components/App';

interface PageProps {
  params: {
    poseId: string;
  };
}

export default function PosePage({ params }: PageProps) {
    const exercise = exercises.find(ex => ex.id === params.poseId);

    if (!exercise) {
        return <div>Exercise not found</div>;
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">{exercise.title}</h1>
            <App exercise={exercise} />
        </div>
    );
}

// Add this to generate static paths
export async function generateStaticParams() {
    return exercises.map((exercise) => ({
        id: exercise.id.toString(),
    }));
} 