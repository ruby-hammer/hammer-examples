# encoding: UTF-8
module Examples
  module Counters
    class Base < Hammer::Component::Base

      attr_reader :counters
      alias_method :collection, :counters

      # defines the state after new instance is created
      after_initialize { @counters = []; add }

      changing do

        # adds new counter
        def add
          counters << Examples::Counters::Counter.new(:collection => self)
        end

        # removes a +counter+
        def remove(counter)
          counters.delete(counter)
        end

      end

      class Widget < widget_class :Collection
        def after
          link_to('Add counter').action { add }
        end
      end

    end
  end
end
