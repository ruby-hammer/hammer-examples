module Examples::Passing
  class Base < Hammer::Component::Base
    class Widget < widget_class :Widget
      def content
        text 'passing component: '
        link_to("pass").action do
          pass_on ask(Passe.new) {|_| retake_control! }
        end
      end
    end
  end

  class Passe < Hammer::Component::Base
    class Widget < widget_class :Widget
      def content
        text 'passe component: '
        link_to("retake control").action { answer! }
      end
    end
  end
end