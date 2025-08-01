import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  MicrophoneIcon,
  DocumentTextIcon,
  CogIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const HomePage = () => {
  const { currentUser } = useAuth();
  const { info } = useNotifications();

  const features = [
    {
      name: "Grabación de Voz",
      description:
        "Graba y procesa tu voz en tiempo real con nuestra tecnología avanzada.",
      icon: MicrophoneIcon,
      path: "/grabar",
      color: "bg-indigo-100 text-indigo-600",
      hover: "hover:bg-indigo-600 hover:text-white",
    },
    {
      name: "Transcripciones",
      description:
        "Convierte automáticamente tu voz a texto con alta precisión.",
      icon: DocumentTextIcon,
      path: "/transcripciones",
      color: "bg-green-100 text-green-600",
      hover: "hover:bg-green-600 hover:text-white",
    },
    {
      name: "Configuración",
      description: "Personaliza tu experiencia según tus preferencias.",
      icon: CogIcon,
      path: "/configuracion",
      color: "bg-yellow-100 text-yellow-600",
      hover: "hover:bg-yellow-600 hover:text-white",
    },
    {
      name: "Equipo",
      description: "Conoce al equipo detrás de Voice Advance.",
      icon: UserGroupIcon,
      path: "/equipo",
      color: "bg-purple-100 text-purple-600",
      hover: "hover:bg-purple-600 hover:text-white",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center py-12 sm:py-16 lg:py-20">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Bienvenido a Voice Advance
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Transforma tu voz en texto con precisión y facilidad. La herramienta
          definitiva para transcripciones y más.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <Link
              to="/grabar"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
            >
              Comenzar a grabar
              <MicrophoneIcon
                className="ml-2 -mr-1 h-5 w-5"
                aria-hidden="true"
              />
            </Link>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <Link
              to="/tutoriales"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
            >
              Ver tutoriales
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-12">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">
          Características principales
        </h2>
        <p className="mt-2 text-lg text-gray-500 text-center max-w-3xl mx-auto">
          Descubre todo lo que puedes hacer con Voice Advance
        </p>

        <div className="mt-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Link
                key={feature.name}
                to={feature.path}
                className={`pt-6 pb-8 px-6 rounded-lg transition-colors duration-200 ${feature.hover}`}
                onClick={() => info(`Redirigiendo a ${feature.name}`)}
              >
                <div
                  className={`h-12 w-12 rounded-md flex items-center justify-center ${feature.color} mb-4`}
                >
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  {feature.name}
                </h3>
                <p className="mt-2 text-base text-gray-600">
                  {feature.description}
                </p>
                <div className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 group">
                  Ver más
                  <ArrowRightIcon
                    className="ml-1 h-4 w-4 transform group-hover:translate-x-1 transition-transform"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-16">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center">
          Actividad reciente
        </h2>
        <p className="mt-2 text-lg text-gray-500 text-center max-w-3xl mx-auto">
          Tu actividad más reciente en la plataforma
        </p>

        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Sin actividad reciente
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza a usar la aplicación para ver tu actividad aquí.
              </p>
              <div className="mt-6">
                <Link
                  to="/grabar"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <MicrophoneIcon
                    className="-ml-1 mr-2 h-5 w-5"
                    aria-hidden="true"
                  />
                  Nueva grabación
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
