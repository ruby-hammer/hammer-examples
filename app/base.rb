# encoding: UTF-8
module Examples
  class Base < Hammer::Component::Base

    attr_reader :example, :other
    changing { attr_writer :example  }

    after_initialize { @other = Examples::Counters::Base.new }

    Data = Struct.new("Data", :name, :sex, :password, :hidden, :description)

    class Widget < widget_class :Widget
      css do
        li { list_style 'square' }
      end

      def wrapper_classes
        super << 'container' #<< 'showgrid'
      end

      def content
        h1 'Examples'
        ul do
          li { link_to("Counters").action { self.example = Examples::Counters::Base.new } }
          li { link_to("#ask").action { self.example = Examples::Ask::Base.new } }
          li do
            link_to("Form").action do
              self.example = Examples::Form::Base.new \
                  :record => Data.new
            end
          end
          li { link_to("Drag").action { self.example = Examples::Dragg::Base.new } }
          li { link_to("passing").action { self.example = Examples::Passing::Base.new } }
          li { link_to('none').action { self.example = nil } }
        end
        hr

        render example if example
      end
    end

  end
end
