module Examples
  module Dragg
    class Base < Hammer::Component::Base

      attr_reader :draggables, :droppable
      after_initialize do
        @draggables = Array.new(3) {|i| Draggable.new(:number => i) }
        @droppable = Droppable.new
      end

      class Widget < widget_class :Widget
        def content
          h3 'Drag'

          draggables.each {|d| render d }
          render droppable
        end
      end
    end

    class Draggable < Hammer::Component::Base

      include Hammer::Component::Draggable
      draggable :revert => true
      needs :number
      attr_reader :number

      class Widget < widget_class :Widget
        css do
          this! do
            border '1px solid silver'
            width '200px'
            line_height '3em';
          end
        end

        def content
          strong "Dragable #{number}"
        end
      end

    end

    class Droppable < Hammer::Component::Base
      include Hammer::Component::Droppable
      droppable :onDrop => lambda { |droppable_component| @numbers << droppable_component.number; change! }          
      
      attr_reader :numbers
      after_initialize { @numbers = [] }

      class Widget < widget_class :Widget
        css do
          this! do
            border '1px solid silver'
            width '200px'
            height '100px'
          end
        end
        def content
          strong 'Drop'
          p numbers.inspect
        end
      end
    end
  end
end
