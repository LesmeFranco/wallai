import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

/**
 * Los dialogos de confirmar y avisar, con el estilo de la app.
 *
 * POR QUE NO `Alert.alert`. El cuadro nativo de Android no se puede estilar:
 * sale con el fondo, la tipografia y los botones del sistema, en el medio de
 * una app que es oscura y tiene su propia tipografia. Aparece justo en los dos
 * momentos mas delicados -borrar algo que no se puede recuperar y salir de un
 * grupo-, que son exactamente los momentos en que la persona necesita
 * reconocer que sigue dentro de la misma app.
 *
 * POR QUE UN PROVEEDOR Y NO UN COMPONENTE SUELTO. Con un componente hay que
 * declarar estado en cada pantalla (cual dialogo esta abierto, con que texto,
 * que hacer al confirmar) y el llamado deja de ser una linea. Con esto el
 * llamado sigue siendo tan corto como el de `Alert`, pero devuelve una promesa,
 * que es mas facil de leer que un callback:
 *
 *     if (await confirmar({ titulo: '¿Borrar este gasto?' })) borrar();
 *
 * Y el dialogo se dibuja UNA sola vez, en la raiz: no hay forma de que dos
 * pantallas lo pinten distinto.
 */

type Accion = {
  texto: string;
  /** Un boton destructivo va en coral: borrar y salir no se deshacen. */
  destructivo?: boolean;
};

type OpcionesConfirmar = {
  titulo: string;
  mensaje?: string;
  /** Texto del boton que confirma. Por defecto "Confirmar". */
  confirmar?: string;
  /** Texto del boton que cancela. Por defecto "Cancelar". */
  cancelar?: string;
  destructivo?: boolean;
};

type OpcionesAviso = {
  titulo: string;
  mensaje?: string;
  cerrar?: string;
};

type Dialogos = {
  /** Pregunta y devuelve si la persona confirmo. */
  confirmar: (opciones: OpcionesConfirmar) => Promise<boolean>;
  /** Avisa algo con un solo boton. */
  avisar: (opciones: OpcionesAviso) => Promise<void>;
};

const ContextoDialogos = createContext<Dialogos | null>(null);

type EstadoDialogo = {
  titulo: string;
  mensaje?: string;
  aceptar: Accion;
  /** Sin esto, el dialogo tiene un solo boton: es un aviso, no una pregunta. */
  cancelar?: Accion;
};

export function ProveedorDeDialogos({ children }: { children: ReactNode }) {
  const [dialogo, setDialogo] = useState<EstadoDialogo | null>(null);

  /**
   * Como se contesta la promesa del dialogo abierto.
   *
   * Va en un ref y no en estado porque no se dibuja: guardarlo en estado
   * forzaria un render de mas por cada dialogo, y ademas habria que leerlo
   * dentro de un callback, donde el valor del render viejo puede estar viejo.
   */
  const responder = useRef<((confirmado: boolean) => void) | null>(null);

  const cerrar = useCallback((confirmado: boolean) => {
    setDialogo(null);
    responder.current?.(confirmado);
    responder.current = null;
  }, []);

  const valor = useMemo<Dialogos>(
    () => ({
      confirmar: (opciones) =>
        new Promise<boolean>((resolver) => {
          responder.current = resolver;
          setDialogo({
            titulo: opciones.titulo,
            mensaje: opciones.mensaje,
            aceptar: {
              texto: opciones.confirmar ?? 'Confirmar',
              destructivo: opciones.destructivo,
            },
            cancelar: { texto: opciones.cancelar ?? 'Cancelar' },
          });
        }),

      avisar: (opciones) =>
        new Promise<void>((resolver) => {
          responder.current = () => resolver();
          setDialogo({
            titulo: opciones.titulo,
            mensaje: opciones.mensaje,
            aceptar: { texto: opciones.cerrar ?? 'Entendido' },
          });
        }),
    }),
    [],
  );

  return (
    <ContextoDialogos.Provider value={valor}>
      {children}

      <Modal
        visible={dialogo !== null}
        transparent
        /**
         * La animacion es la nativa del Modal y no una de Reanimated a
         * proposito: las animaciones de entrada de Reanimated no siempre se
         * disparan dentro de un Modal en Android, y cuando no se disparan la
         * vista puede quedar invisible. Un dialogo que a veces no aparece es
         * mucho peor que uno sin animacion propia. Es el mismo criterio que usa
         * la hoja de EditorDeGasto.
         */
        animationType="fade"
        // El boton de atras de Android cancela, igual que tocar afuera.
        onRequestClose={() => cerrar(false)}
      >
        {dialogo ? (
          <View className="flex-1 justify-center bg-black/70">
            {/* Tocar el fondo cancela. Va como Pressable que ocupa toda la
                pantalla, con la tarjeta encima, para que el toque de afuera no
                tenga que distinguirse del de adentro por coordenadas. */}
            <Pressable
              className="absolute bottom-0 left-0 right-0 top-0"
              onPress={() => cerrar(false)}
            />

            <View className="mx-7 rounded-tarjeta border-[1.5px] border-borde bg-superficie p-6">
              <Text className="font-display-extra text-[19px] leading-6 tracking-tight text-primario">
                {dialogo.titulo}
              </Text>

              {dialogo.mensaje ? (
                <Text className="mt-2.5 font-cuerpo text-[14px] leading-5 text-secundario">
                  {dialogo.mensaje}
                </Text>
              ) : null}

              <View className="mt-6 flex-row gap-3">
                {dialogo.cancelar ? (
                  <Pressable
                    onPress={() => cerrar(false)}
                    className="flex-1 items-center rounded-boton border-[1.5px] border-borde-claro py-3.5 active:opacity-70"
                  >
                    <Text className="font-cuerpo-semi text-[15px] text-secundario">
                      {dialogo.cancelar.texto}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => cerrar(true)}
                  className={`flex-1 items-center rounded-boton py-3.5 active:opacity-80 ${
                    dialogo.aceptar.destructivo ? 'bg-coral' : 'bg-lima'
                  }`}
                >
                  {/* El texto va en el color del fondo de la app y no en blanco:
                      sobre lima o coral, un blanco puro no tiene contraste
                      suficiente para leerse comodo. */}
                  <Text className="font-cuerpo-semi text-[15px] text-fondo">
                    {dialogo.aceptar.texto}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </ContextoDialogos.Provider>
  );
}

export function useDialogos(): Dialogos {
  const contexto = useContext(ContextoDialogos);
  if (!contexto) {
    throw new Error('useDialogos tiene que usarse dentro de ProveedorDeDialogos.');
  }
  return contexto;
}
