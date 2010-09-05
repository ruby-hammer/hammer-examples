# encoding: UTF-8
module Examples
  module Ask
    class Counter < Examples::Counter

      class Widget < widget_class :Widget

        # adds links to answer the number (counter) or
        # to answer nothing.
        # Everything else is as we need.
        def actions
          link_to('Add number').action { answer!(counter) }
          link_to('Cancel').action { answer! }
        end
      end
    end

  end
end
